# Iteration 事件

追蹤 Tool Call 的多輪迭代。

---

## 概述

當 AI 呼叫工具時，會產生多輪「迭代」：

1. **Iteration 0**：AI 決定呼叫工具
2. **Iteration 1**：工具執行完成，AI 根據結果繼續回應
3. **Iteration N**：如果需要更多工具呼叫，繼續迭代

`iteration.*` 事件讓前端知道目前在哪一輪，方便顯示進度或除錯。

---

## 事件列表

| 事件 | 角色 | 說明 |
|------|------|------|
| `iteration.started` | 信號 | 迭代開始 |
| `iteration.completed` | 信號 | 迭代完成 |

---

## iteration.started

迭代開始事件。

### 事件結構

```typescript
{
  type: 'iteration.started',
  iteration: number,          // 迭代次數（從 0 開始）
  assistant_msg_id?: number,  // 該輪的 assistant message ID
  timestamp: string
}
```

### 範例

```json
{
  "type": "iteration.started",
  "iteration": 0,
  "assistant_msg_id": 123,
  "timestamp": "2025-12-13T10:00:00Z"
}
```

---

## iteration.completed

迭代完成事件。

### 事件結構

```typescript
{
  type: 'iteration.completed',
  iteration: number,
  has_next_iteration: boolean,  // 是否還有下一輪
  timestamp: string
}
```

### 範例

```json
{
  "type": "iteration.completed",
  "iteration": 0,
  "has_next_iteration": true,
  "timestamp": "2025-12-13T10:00:02Z"
}
```

---

## 事件流程

### Server-side Tool Call

```
iteration.started (0)
  → tool.preparing
  → tool.call
  → tool.result
  → iteration.completed (0, has_next: true)

iteration.started (1)
  → text.chunk...
  → iteration.completed (1, has_next: false)

conversation.completed
```

### Client-side Tool Call（兩輪 HTTP）

```
【第一輪 HTTP】
iteration.started (0)
  → tool.execute
  → iteration.completed (0)     ← 本輪 HTTP 內成對
conversation.paused

【第二輪 HTTP】
conversation.resumed
iteration.started (1)           ← 編號延續
  → text.chunk...
  → iteration.completed (1)
conversation.completed
```

---

## 設計原則

### 1. 每輪 HTTP 內成對

`iteration.started` 和 `iteration.completed` 必須在**同一輪 HTTP** 內成對出現。

**為什麼？**
- 跨 HTTP 的事件無法保證順序
- 前端用 `started`/`completed` 管理狀態，必須成對才不會 leak

### 2. 編號連續

即使跨 HTTP，iteration 編號仍然連續：

```
第一輪 HTTP: iteration 0
第二輪 HTTP: iteration 1
第三輪 HTTP: iteration 2
...
```

### 3. 進階功能

大多數前端不需要處理 `iteration.*` 事件。這是給：
- 顯示「第 N 輪處理中」的 UI
- 除錯和監控
- 複雜的狀態管理

---

## 前端處理（可選）

```typescript
let currentIteration = 0;

eventSource.addEventListener('iteration.started', (e) => {
  const { iteration } = JSON.parse(e.data);
  currentIteration = iteration;
  console.log(`開始第 ${iteration} 輪迭代`);
});

eventSource.addEventListener('iteration.completed', (e) => {
  const { iteration, has_next_iteration } = JSON.parse(e.data);
  console.log(`第 ${iteration} 輪完成，${has_next_iteration ? '還有下一輪' : '結束'}`);
});
```

---

## 相關文件

- [設計原理](./design-principles.md) - iteration 成對原則
- [Tool 事件](./tool-events.md) - 工具呼叫如何觸發迭代

---

**最後更新**: 2025-12-13
