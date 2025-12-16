# 事件設計原理

本文檔說明 V4 API 事件系統的設計原理與決策記錄。

---

## 核心設計原則

### 1. 事件角色分類

V4 的事件依「前端需要做什麼」分為三種角色：

| 角色 | 說明 | 前端行為 | 事件範例 |
|------|------|---------|---------|
| **通知** | 告知前端「發生了什麼」 | 顯示 UI、更新狀態 | `tool.call`, `text.chunk` |
| **請求** | 要求前端「執行動作」 | 執行操作、回傳結果 | `tool.execute` |
| **信號** | 標記「流程節點」 | 狀態轉換、流程控制 | `conversation.paused`, `conversation.resumed` |

#### 為什麼這樣分類？

**通知 vs 請求** 的區別至關重要：

```
tool.call     → 通知：「AI 呼叫了 get_weather」   → 前端：顯示「查詢天氣中...」
tool.execute  → 請求：「請執行 set_temperature」 → 前端：執行 UI 操作 + 回傳結果
```

如果混淆這兩者，前端會不知道：
- 這個事件只是「讓我知道」還是「要我做事」？
- 需不需要回應？怎麼回應？

---

### 2. 成對事件原則

生命週期事件必須成對出現：

| 開始事件 | 結束事件 | 說明 |
|---------|---------|------|
| `conversation.started` | `conversation.completed` / `error` | 對話生命週期 |
| `iteration.started` | `iteration.completed` | 迭代生命週期 |
| `text.started` | `text.completed` | 文字輸出生命週期 |
| `reasoning.started` | `reasoning.completed` | 推理生命週期 |

#### 為什麼必須成對？

1. **前端狀態管理**：`started` 時設置狀態，`completed` 時清除
2. **錯誤處理**：如果只有 `started` 沒有 `completed`，前端知道出問題了
3. **UI 一致性**：確保「載入中」等 UI 狀態能正確結束

---

### 3. 彙總信號原則

當有多個同類事件時，用一個彙總信號確認「都收到了」：

```
tool.execute (call_1)
tool.execute (call_2)
tool.execute (call_3)
conversation.paused { pending_tools: [call_1, call_2, call_3] }  ← 彙總
```

#### 為什麼需要彙總？

**問題**：串流環境下，前端不知道「還有沒有更多事件」

**解法**：`conversation.paused` 作為「結束信號」，並附帶完整清單

**好處**：
- 簡單實作只看 `paused`，不需要追蹤每個 `tool.execute`
- 進階實作可以搭配 `tool.execute` 做即時 UI

---

## 關鍵事件設計決策

### `conversation.paused`

```typescript
{
  type: 'conversation.paused',
  reason: 'client_tool_execution',
  pending_tools: [{ call_id, name, arguments }],
  timestamp: string
}
```

#### 設計決策

| 欄位 | 決策 | 原因 |
|------|------|------|
| `reason` | **必填** | 前端需要知道「為什麼暫停」才能決定下一步 |
| `pending_tools` | **可選** | 只有 `client_tool_execution` 需要，其他 reason 不需要 |
| `pending_tools` 是陣列 | **支援多工具** | AI 可能一次呼叫多個 client-side function |

#### `reason` 值說明

| 值 | 觸發時機 | 前端行為 |
|----|---------|---------|
| `client_tool_execution` | AI 呼叫 client-side function | 執行 UI 操作，發起第二輪請求 |
| `tool_approval_required` | 工具需要使用者批准 | 顯示確認對話框 |
| `user_input_required` | 需要使用者額外輸入 | 顯示輸入框 |

---

### `conversation.resumed`

```typescript
{
  type: 'conversation.resumed',
  conversation_id: string,
  timestamp: string
}
```

#### 設計決策

| 決策 | 原因 |
|------|------|
| 獨立事件，不用 `started` | 前端處理邏輯不同（`started` 會重置 UI，`resumed` 不會） |
| 保留 `conversation_id` | 讓前端確認是同一對話的延續 |
| 不需要 `resumed_from` | 目前只有一種情況，YAGNI 原則 |

#### 為什麼不能用 `conversation.started`？

```typescript
// 如果用 started，前端會這樣寫：
eventSource.addEventListener('conversation.started', () => {
  clearChat();        // 清空聊天紀錄
  resetState();       // 重置狀態
});

// 問題：第二輪 HTTP 也收到 started，會把第一輪的內容清掉！
```

用 `resumed` 就能區分：
```typescript
eventSource.addEventListener('conversation.started', () => {
  clearChat();        // 新對話：清空
});

eventSource.addEventListener('conversation.resumed', () => {
  // 延續對話：不清空，只繼續接收
});
```

---

### `tool.execute` vs `tool.call`

| 事件 | 性質 | 前端行為 | 需要回應？ |
|------|------|---------|-----------|
| `tool.call` | 通知 | 顯示「AI 呼叫了 XXX」 | ❌ |
| `tool.execute` | 請求 | 執行 UI 操作 | ✅ 透過 `tool_outputs` |

#### 為什麼不擴展 `tool.call`？

考慮過在 `tool.call` 加一個 `execution_location: 'client'` 欄位，但：

1. **語義不清**：`tool.call` 原本是「通知」，加上「請求」的語義會混淆
2. **向後相容**：現有前端已經把 `tool.call` 當通知處理，改變語義會 break
3. **清晰分離**：新事件 `tool.execute` 明確表達「這需要你處理」

---

### `iteration.*` 事件

```typescript
{ type: 'iteration.started', iteration: 0 }
{ type: 'iteration.completed', iteration: 0, has_next_iteration: true }
```

#### 設計決策

| 決策 | 原因 |
|------|------|
| 每輪 HTTP 內成對 | 跨 HTTP 的事件無法保證送達順序 |
| `iteration` 從 0 開始 | 程式慣例 |
| `has_next_iteration` 欄位 | 讓前端知道「還有下一輪嗎」 |

#### 跨 HTTP 的 iteration 如何處理？

```
【第一輪 HTTP】
iteration.started (0)
...
iteration.completed (0)    ← 第一輪結束
conversation.paused

【第二輪 HTTP】
conversation.resumed
iteration.started (1)      ← 第二輪開始
...
iteration.completed (1)
conversation.completed
```

**重點**：`iteration` 編號是連續的（0, 1, 2...），但事件在各自的 HTTP 內成對。

---

## 設計原則總結

1. **明確角色**：每個事件都要清楚是「通知」、「請求」還是「信號」
2. **成對出現**：生命週期事件必須有開始和結束
3. **彙總確認**：多個同類事件後，用信號事件確認完整性
4. **向後相容**：新功能用新事件，不改變現有事件語義
5. **YAGNI**：不預先設計用不到的欄位，需要再加

---

**最後更新**: 2025-12-13
