# Conversation 事件

控制對話的生命週期和狀態。

---

## 事件列表

| 事件 | 角色 | 說明 |
|------|------|------|
| `conversation.started` | 信號 | 對話開始（新對話） |
| `conversation.resumed` | 信號 | 對話恢復（延續對話） |
| `conversation.paused` | 信號 | 對話暫停（等待前端） |
| `conversation.completed` | 信號 | 對話完成 |
| `conversation.error` | 信號 | 對話錯誤 |
| `conversation.canceled` | 信號 | 對話取消 |
| `conversation.timeout` | 信號 | 對話逾時 |

---

## conversation.started

對話開始事件，是每個**新對話**的第一個事件。

### 事件結構

```typescript
{
  type: 'conversation.started',
  conversation_id: string,    // 對話唯一識別碼
  thread_id?: number,         // Thread ID（如果有）
  timestamp: string           // ISO 8601 時間戳記
}
```

### 範例

```json
{
  "type": "conversation.started",
  "conversation_id": "conv_abc123",
  "thread_id": 42,
  "timestamp": "2025-12-13T10:00:00Z"
}
```

### 前端處理

```typescript
eventSource.addEventListener('conversation.started', (e) => {
  const { conversation_id, thread_id } = JSON.parse(e.data);

  // 重置 UI 狀態
  clearMessages();
  setConversationId(conversation_id);
  showTypingIndicator();
});
```

---

## conversation.resumed

對話恢復事件，用於**延續暫停的對話**。

### 事件結構

```typescript
{
  type: 'conversation.resumed',
  conversation_id: string,    // 與暫停前相同的對話 ID
  timestamp: string
}
```

### 範例

```json
{
  "type": "conversation.resumed",
  "conversation_id": "conv_abc123",
  "timestamp": "2025-12-13T10:00:05Z"
}
```

### 與 `started` 的差異

| 事件 | 觸發時機 | 前端行為 |
|------|---------|---------|
| `started` | 新對話開始 | 清空聊天、重置狀態 |
| `resumed` | 暫停後恢復 | **不清空**，保持現有狀態 |

### 前端處理

```typescript
eventSource.addEventListener('conversation.resumed', (e) => {
  const { conversation_id } = JSON.parse(e.data);

  // 不要清空！保持第一輪的 UI 狀態
  // 只顯示「AI 正在回應...」
  showTypingIndicator();
});
```

---

## conversation.paused

對話暫停事件，SSE 連線將結束，等待前端採取行動。

### 事件結構

```typescript
{
  type: 'conversation.paused',
  reason: 'client_tool_execution' | 'tool_approval_required' | 'user_input_required',
  pending_tools?: Array<{     // 僅 client_tool_execution
    call_id: string,
    name: string,
    arguments: string
  }>,
  timestamp: string
}
```

### 暫停原因

| reason | 說明 | 前端行為 |
|--------|------|---------|
| `client_tool_execution` | 等待前端執行 client-side function | 執行 UI 操作 → 發起第二輪請求 |
| `tool_approval_required` | 等待使用者批准工具執行 | 顯示確認對話框 |
| `user_input_required` | 等待使用者額外輸入 | 顯示輸入框 |

### 範例：Client-side Tool Execution

```json
{
  "type": "conversation.paused",
  "reason": "client_tool_execution",
  "pending_tools": [
    {
      "call_id": "call_123",
      "name": "set_temperature",
      "arguments": "{\"value\": 0.8}"
    }
  ],
  "timestamp": "2025-12-13T10:00:01Z"
}
```

### 前端處理

```typescript
eventSource.addEventListener('conversation.paused', async (e) => {
  const { reason, pending_tools } = JSON.parse(e.data);

  if (reason === 'client_tool_execution') {
    // 執行所有待處理的 client-side function
    const results = [];
    for (const tool of pending_tools) {
      const result = await executeClientTool(tool.name, JSON.parse(tool.arguments));
      results.push({ call_id: tool.call_id, output: JSON.stringify(result) });
    }

    // 發起第二輪請求
    fetch('/v4/response', {
      method: 'POST',
      body: JSON.stringify({
        thread_id: currentThreadId,
        tool_outputs: results
      })
    });
  }
});
```

---

## conversation.completed

對話完成事件，是正常結束時的最後一個事件。

### 事件結構

```typescript
{
  type: 'conversation.completed',
  conversation_id: string,
  status: 'success' | 'partial_success' | 'with_errors',
  timestamp: string,
  token_usage?: {             // 可選
    input_tokens: number,
    output_tokens: number,
    total_tokens: number
  }
}
```

### status 說明

| 值 | 說明 |
|----|------|
| `success` | 完全成功 |
| `partial_success` | 部分成功（例如某些工具失敗但對話完成） |
| `with_errors` | 有錯誤但仍產生輸出 |

### 範例

```json
{
  "type": "conversation.completed",
  "conversation_id": "conv_abc123",
  "status": "success",
  "timestamp": "2025-12-13T10:01:00Z",
  "token_usage": {
    "input_tokens": 100,
    "output_tokens": 200,
    "total_tokens": 300
  }
}
```

### 前端處理

```typescript
eventSource.addEventListener('conversation.completed', (e) => {
  const { status, token_usage } = JSON.parse(e.data);

  // 關閉 SSE 連線
  eventSource.close();

  // 隱藏載入指示器
  hideTypingIndicator();

  // 記錄 token 使用量
  if (token_usage) {
    logTokenUsage(token_usage);
  }
});
```

---

## conversation.error

對話錯誤事件，發生致命錯誤時發送。

### 事件結構

```typescript
{
  type: 'conversation.error',
  error_code: string,         // 錯誤代碼
  message: string,            // 使用者友善的錯誤訊息
  details?: object,           // 錯誤詳細資訊
  recoverable: boolean        // 是否可重試
}
```

### 常見錯誤代碼

| 代碼 | 說明 | recoverable |
|------|------|-------------|
| `PROVIDER_ERROR` | LLM Provider 錯誤 | 通常 `true` |
| `RATE_LIMITED` | 請求過於頻繁 | `true` |
| `CONTEXT_TOO_LONG` | 上下文超過限制 | `false` |
| `INVALID_REQUEST` | 請求參數錯誤 | `false` |

### 範例

```json
{
  "type": "conversation.error",
  "error_code": "PROVIDER_ERROR",
  "message": "模型服務暫時無法使用，請稍後再試",
  "details": {
    "provider": "openai",
    "status": 503
  },
  "recoverable": true
}
```

### 前端處理

```typescript
eventSource.addEventListener('conversation.error', (e) => {
  const { error_code, message, recoverable } = JSON.parse(e.data);

  // 關閉連線
  eventSource.close();

  // 顯示錯誤
  showError(message);

  // 如果可重試，顯示重試按鈕
  if (recoverable) {
    showRetryButton();
  }
});
```

---

## 事件流程圖

### 正常對話

```
conversation.started
  → ... (其他事件)
  → conversation.completed
```

### Client-side Tool Call（兩輪）

```
【第一輪 HTTP】
conversation.started
  → ...
  → conversation.paused (reason: client_tool_execution)

【第二輪 HTTP】
conversation.resumed
  → ...
  → conversation.completed
```

### 發生錯誤

```
conversation.started
  → ... (部分事件)
  → conversation.error
  → conversation.completed (status: 'error')
```

---

## 相關文件

- [設計原理](./design-principles.md) - 為什麼 `started` 和 `resumed` 要分開
- [Tool 事件](./tool-events.md) - Client-side Function Call 詳細說明

---

**最後更新**: 2025-12-13
