# V4 API 事件總覽

本目錄包含 V4 API 所有 Client Event 的完整文檔。

---

## 快速索引

| 文件 | 事件系列 | 說明 |
|------|---------|------|
| [design-principles.md](./design-principles.md) | - | 事件設計原理與決策 |
| [conversation-events.md](./conversation-events.md) | `conversation.*` | 對話生命週期控制 |
| [iteration-events.md](./iteration-events.md) | `iteration.*` | 多輪迭代追蹤 |
| [text-events.md](./text-events.md) | `text.*` | 文字輸出串流 |
| [tool-events.md](./tool-events.md) | `tool.*` | 工具呼叫（含 Client-side） |
| [reasoning-events.md](./reasoning-events.md) | `reasoning.*` | 推理/思考過程 |
| [search-events.md](./search-events.md) | `web_search.*`, `file_search.*` | 搜尋功能 |

---

## 事件分類

### 依性質分類

| 性質 | 說明 | 事件 |
|------|------|------|
| **生命週期** | 對話開始/結束 | `conversation.started`, `conversation.completed`, `conversation.error` |
| **狀態控制** | 暫停/恢復 | `conversation.paused`, `conversation.resumed` |
| **內容串流** | 逐步輸出 | `text.chunk`, `reasoning.chunk` |
| **工具通知** | 通知前端（僅顯示） | `tool.preparing`, `tool.call`, `tool.result` |
| **工具請求** | 請求前端執行 | `tool.execute` |

### 依處理優先級

| 優先級 | 說明 | 事件 |
|--------|------|------|
| **必須處理** | 基本功能必需 | `text.chunk`, `conversation.completed`, `conversation.error` |
| **建議處理** | 提升使用體驗 | `conversation.started`, `text.started`, `text.completed` |
| **進階功能** | 特定功能需要 | `tool.*`, `reasoning.*`, `iteration.*` |

---

## 前端實作層級

### Level 1：基礎實作

只處理文字輸出，適合簡單聊天介面。

```typescript
// 必須處理
eventSource.addEventListener('text.chunk', handler);
eventSource.addEventListener('conversation.completed', handler);
eventSource.addEventListener('conversation.error', handler);
```

### Level 2：完整實作

處理所有通知事件，提供完整的 UI 回饋。

```typescript
// Level 1 +
eventSource.addEventListener('conversation.started', handler);
eventSource.addEventListener('text.started', handler);
eventSource.addEventListener('text.completed', handler);
eventSource.addEventListener('tool.call', handler);      // 顯示工具呼叫
eventSource.addEventListener('tool.result', handler);    // 顯示執行結果
```

### Level 3：進階實作

支援 Client-side Function Call、推理過程顯示等進階功能。

```typescript
// Level 2 +
eventSource.addEventListener('tool.execute', handler);        // Client-side 工具
eventSource.addEventListener('conversation.paused', handler); // 暫停處理
eventSource.addEventListener('conversation.resumed', handler);// 恢復處理
eventSource.addEventListener('reasoning.chunk', handler);     // 思考過程
eventSource.addEventListener('iteration.started', handler);   // 迭代追蹤
```

---

## 常見事件流程

### 簡單文字輸出

```
conversation.started
  → text.started
  → text.chunk (x N)
  → text.completed
  → conversation.completed
```

### Server-side Tool Call

```
conversation.started
  → iteration.started (0)
  → tool.preparing → tool.call → tool.result
  → iteration.completed
  → iteration.started (1)
  → text.chunk (x N)
  → iteration.completed
  → conversation.completed
```

### Client-side Tool Call

```
【第一輪 HTTP】
conversation.started
  → iteration.started (0)
  → tool.execute
  → iteration.completed
  → conversation.paused

【第二輪 HTTP】
conversation.resumed
  → iteration.started (1)
  → text.chunk (x N)
  → iteration.completed
  → conversation.completed
```

---

## 相關文件

- [設計原理](./design-principles.md) - 深入了解事件設計的原因
- [請求參數](../request.md) - API 請求格式
- [Client-side Function Call](../../tool_client_docs/client-side-function-call.md) - 完整設計文檔

---

**最後更新**: 2025-12-13
