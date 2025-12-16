# Tool 事件

模型呼叫工具（Function Call）時的事件序列，包含 Server-side 和 Client-side 兩種模式。

---

## 概述

Tool 事件分為兩類：

| 類型 | 執行位置 | 前端角色 |
|------|---------|---------|
| **Server-side** | 後端 | 觀察者（顯示進度） |
| **Client-side** | 前端 | 執行者（執行並回傳） |

---

## 事件列表

| 事件 | 角色 | 說明 |
|------|------|------|
| `tool.preparing` | 通知 | 工具準備中（開始組裝參數） |
| `tool.call` | 通知 | 工具調用（參數組裝完成） |
| `tool.result` | 通知 | 工具執行結果 |
| `tool.error` | 通知 | 工具執行失敗 |
| `tool.execute` | **請求** | 請求前端執行（Client-side） |
| `tool.approved` | 信號 | 使用者批准執行 ⚠️ *未實作* |
| `tool.denied` | 信號 | 使用者拒絕執行 ⚠️ *未實作* |

---

## Server-side Tool Call

後端執行的工具，前端只需顯示進度。

### 事件流程

```
tool.preparing → tool.call → tool.result
```

### tool.preparing

工具準備中，模型開始組裝參數。

```typescript
{
  type: 'tool.preparing',
  call_id: string,
  name?: string,              // 可能尚未確定
  timestamp: string
}
```

**用途**：讓前端提前顯示「準備中...」UI

### tool.call

工具調用，參數組裝完成。

```typescript
{
  type: 'tool.call',
  call_id: string,
  tool_type: 'function' | 'mcp',
  name: string,
  arguments: string,          // JSON 字串
  timestamp: string
}
```

**範例**：
```json
{
  "type": "tool.call",
  "call_id": "call_123",
  "tool_type": "function",
  "name": "get_weather",
  "arguments": "{\"city\": \"台北\"}",
  "timestamp": "2025-12-13T10:00:01Z"
}
```

### tool.result

工具執行結果。

```typescript
{
  type: 'tool.result',
  call_id: string,
  tool_type: 'function' | 'mcp',
  name: string,
  success: boolean,
  output: string,             // JSON 字串
  timestamp: string
}
```

**範例**：
```json
{
  "type": "tool.result",
  "call_id": "call_123",
  "tool_type": "function",
  "name": "get_weather",
  "success": true,
  "output": "{\"temperature\": 25, \"weather\": \"晴天\"}",
  "timestamp": "2025-12-13T10:00:02Z"
}
```

### tool.error

工具執行失敗。

```typescript
{
  type: 'tool.error',
  call_id: string,
  tool_type: 'function' | 'mcp',
  name: string,
  error_code: string,
  message: string,
  retryable: boolean,
  details?: string,
  timestamp: string
}
```

### 前端處理範例

```typescript
const toolCalls = new Map();

eventSource.addEventListener('tool.preparing', (e) => {
  const { call_id, name } = JSON.parse(e.data);
  toolCalls.set(call_id, { status: 'preparing', name });
  showToolUI(call_id, '準備中...', name);
});

eventSource.addEventListener('tool.call', (e) => {
  const { call_id, name, arguments: args } = JSON.parse(e.data);
  toolCalls.set(call_id, { status: 'executing', name, args });
  updateToolUI(call_id, `執行 ${name}...`);
});

eventSource.addEventListener('tool.result', (e) => {
  const { call_id, success, output } = JSON.parse(e.data);
  toolCalls.set(call_id, { ...toolCalls.get(call_id), status: 'completed', output });
  updateToolUI(call_id, success ? '完成' : '失敗', output);
});
```

---

## Client-side Tool Call

前端執行的工具，需要前端處理並回傳結果。

### 事件流程

```
【第一輪 HTTP】
tool.execute → conversation.paused

【前端執行 UI 操作】

【第二輪 HTTP（帶 tool_outputs）】
conversation.resumed → text.chunk...
```

### tool.execute

請求前端執行工具。

```typescript
{
  type: 'tool.execute',
  call_id: string,            // 回傳時需要帶上
  name: string,               // 工具名稱
  arguments: string,          // JSON 字串
  timestamp: string
}
```

**範例**：
```json
{
  "type": "tool.execute",
  "call_id": "call_456",
  "name": "set_temperature",
  "arguments": "{\"value\": 0.8}",
  "timestamp": "2025-12-13T10:00:01Z"
}
```

### 前端處理

#### 方式一：只看 `conversation.paused`（簡單）

```typescript
eventSource.addEventListener('conversation.paused', async (e) => {
  const { reason, pending_tools } = JSON.parse(e.data);

  if (reason !== 'client_tool_execution') return;

  // 執行所有待處理的工具
  const results = [];
  for (const tool of pending_tools) {
    const result = await executeClientTool(tool.name, JSON.parse(tool.arguments));
    results.push({
      call_id: tool.call_id,
      output: JSON.stringify(result)
    });
  }

  // 發起第二輪請求
  await fetch('/v4/response', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      thread_id: currentThreadId,
      tool_outputs: results
    })
  });
});
```

#### 方式二：搭配 `tool.execute`（進階 UI）

```typescript
// 即時顯示執行狀態
eventSource.addEventListener('tool.execute', (e) => {
  const { call_id, name, arguments: args } = JSON.parse(e.data);
  showExecutingUI(name, args);  // 顯示「正在設定溫度...」
});

// 確認並執行
eventSource.addEventListener('conversation.paused', async (e) => {
  const { reason, pending_tools } = JSON.parse(e.data);
  if (reason !== 'client_tool_execution') return;

  // 執行並發送結果（同上）
});
```

### Client Tool Handler 範例

```typescript
// 定義 client-side function handlers
const clientToolHandlers: Record<string, (args: any) => Promise<any>> = {

  // 設定溫度
  set_temperature: async ({ value }) => {
    document.getElementById('temperature-input').value = value;
    return { success: true, new_value: value };
  },

  // 設定模型
  set_model: async ({ model }) => {
    document.getElementById('model-select').value = model;
    return { success: true, model };
  },

  // 滾動到指定區域
  scroll_to_section: async ({ section }) => {
    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' });
    return { success: true };
  },

  // 重新整理資料
  refresh_data: async ({ target }) => {
    await dataService.refresh(target);
    return { success: true, count: dataService.getCount(target) };
  }
};

// 執行 client tool
async function executeClientTool(name: string, args: any): Promise<any> {
  const handler = clientToolHandlers[name];

  if (!handler) {
    return { success: false, error: `Unknown tool: ${name}` };
  }

  try {
    return await handler(args);
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

---

## `tool.execute` vs `tool.call`

| 面向 | `tool.call` | `tool.execute` |
|------|-------------|----------------|
| **角色** | 通知 | 請求 |
| **執行位置** | 後端 | 前端 |
| **前端行為** | 顯示 UI | 執行操作 + 回傳 |
| **需要回應** | ❌ | ✅ 透過 `tool_outputs` |

### 為什麼分成兩個事件？

1. **語義清晰**：`call` = 通知，`execute` = 請求
2. **向後相容**：現有前端已把 `call` 當通知，改變語義會 break
3. **處理邏輯不同**：`execute` 需要追蹤、執行、回傳

---

## tool.approved / tool.denied

> ⚠️ **未實作**：這兩個事件目前僅定義型別，尚未實作。保留供未來「工具執行需使用者批准」功能使用。

使用者批准或拒絕工具執行。

```typescript
{
  type: 'tool.approved',
  call_id: string,
  tool_type: 'function' | 'mcp'
}

{
  type: 'tool.denied',
  call_id: string,
  tool_type: 'function' | 'mcp',
  reason?: string
}
```

---

## 相關文件

- [設計原理](./design-principles.md) - `tool.execute` vs `tool.call` 的設計決策
- [Conversation 事件](./conversation-events.md) - `conversation.paused` 詳細說明
- [Client-side Function Call](../../tool_client_docs/client-side-function-call.md) - 完整設計文檔
- [請求參數](../request.md) - `tool_outputs` 參數說明

---

**最後更新**: 2025-12-13
