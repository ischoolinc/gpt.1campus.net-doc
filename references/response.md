# V4 Response API 格式規格

**版本**：v4.0
**最後更新**：2025-11-03
**設計基準**：OpenAI Response API

---

## 🎯 概述

V4 API 提供兩種使用方式：
1. **單階段 API** - 後端 server-to-server 呼叫，支援串流和非串流模式
2. **二階段 API** - 前端直接使用 EventSource 串流，解決瀏覽器 Header 限制

---

## 🔀 API 端點

### 單階段 API

**端點**: `POST /v4/response`

**使用方式**: 後端 server-to-server 呼叫（需要 API Key）

**回應模式**:
- ✅ 支援非串流模式（`stream: false`）
- ✅ 支援串流模式（`stream: true`）

**範例**:
```bash
curl --request POST \
  --url https://your-domain.com/v4/response \
  --header 'Authorization: Bearer prj_xxx.key_yyy' \
  --header 'Content-Type: application/json' \
  --data '{
    "name": "gpt-4o-mini",
    "input": "你好",
    "stream": true
  }'
```

### 二階段 API

**設計目的**: 解決瀏覽器 `EventSource` 無法傳送 `Authorization` Header 的限制

**流程**:

**步驟 1**: `POST /v4/prepare` - 準備串流（後端呼叫）

⚠️ **此 API 必須從後端 server-to-server 呼叫**，因為需要 API Key 驗證

```bash
# 後端呼叫
curl --request POST \
  --url https://your-domain.com/v4/prepare \
  --header 'Authorization: Bearer prj_xxx.key_yyy' \
  --header 'Content-Type: application/json' \
  --data '{
    "name": "gpt-4o-mini",
    "input": "你好"
  }'

# 回傳
{
  "run_token": "run_abc123xyz",
  "thread_id": 456,
  "user_msg_id": 789
}
```

**步驟 2**: `GET /v4/response/:run_token` - 接收串流（前端呼叫）

✅ **此 API 支援 CORS，可以從前端直接呼叫**（不需要 API Key）

```javascript
// 前端直接使用 EventSource
const eventSource = new EventSource(
  'https://your-domain.com/v4/response/run_abc123xyz'
);

eventSource.addEventListener('text.chunk', (event) => {
  const data = JSON.parse(event.data);
  console.log(data.content);
});
```

**重要說明**:
- ⚠️ **二階段 API 僅支援串流模式**（強制 `stream: true`）
- ⚠️ 每個 `run_token` 只能執行一次
- ⚠️ 執行狀態：pending → running → completed
- ✅ 後端取得 run_token 後傳給前端，前端用 EventSource 接收串流

---

## 🔐 API 認證

所有 API 請求都需要使用 **Project API Key** 進行認證。

### 認證方式

在 HTTP Header 中加入 `Authorization` 欄位：

```
Authorization: Bearer prj_<project_code>.key_<random_string>
```

### 範例

```bash
curl --request POST \
  --url https://your-domain.com/v4/response \
  --header 'Authorization: Bearer prj_abc123xyz.key_ExampleKeyDoNotUseInProduction' \
  --header 'Content-Type: application/json' \
  --data '{
    "name": "gpt-4o-mini",
    "input": "你好"
  }'
```

### 如何取得 API Key

1. 登入 1Campus GPT 平台
2. 進入你的 Project 設定
3. 在「API Keys」頁面產生新的 API Key
4. 妥善保管（不要提交到版本控制）

### 認證失敗

如果 API Key 無效或缺失，會收到 `401 Unauthorized` 錯誤：

```json
{
  "error": {
    "code": "unauthorized",
    "message": "無效的 API Key",
    "request_id": "req_abc123"
  }
}
```

---

## 1️⃣ 非串流模式（stream: false）

### HTTP Response

#### 成功回應（200 OK）

**Headers**:
```
HTTP/1.1 200 OK
Content-Type: application/json
X-Request-ID: req_abc123xyz
```

**Body**:
```json
{
  "outputs": [
    {
      "type": "output_text",
      "text": "這是 AI 的完整回答內容"
    }
  ],
  "msg_id": 790,
  "thread_id": 456
}
```

#### 欄位說明

| 欄位 | 型別 | 說明 |
|------|------|------|
| `outputs` | Output[] | 輸出陣列（通常包含一個 `output_text`） |
| `msg_id` | number | AI 回應訊息的資料庫 ID |
| `thread_id` | number | Thread ID（多輪對話使用） |

#### Output 物件結構

| 欄位 | 型別 | 說明 |
|------|------|------|
| `type` | string | 輸出類型：`output_text` |
| `text` | string | AI 完整回應內容 |

**未來可能的 Output 類型**：
- `output_text` - 文字輸出（目前支援）
- `tool_call` - Tool 呼叫（規劃中）
- `reasoning` - 推理內容（規劃中）

---

## 2️⃣ SSE 串流模式（stream: true）

### HTTP Response

**Headers**:
```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Request-ID: req_abc123xyz
```

**Body** (Server-Sent Events):
```
event: conversation.started
data: {"type":"conversation.started","conversation_id":"conv_abc123","thread_id":456,"timestamp":"2025-11-03T10:00:00Z"}

event: conversation.data
data: {"type":"conversation.data","assistant_msg_id":790}

event: iteration.started
data: {"type":"iteration.started","iteration":1,"timestamp":"2025-11-03T10:00:01Z"}

event: model.in_progress
data: {"type":"model.in_progress"}

event: text.started
data: {"type":"text.started"}

event: text.chunk
data: {"type":"text.chunk","content":"這是"}

event: text.chunk
data: {"type":"text.chunk","content":" AI "}

event: text.chunk
data: {"type":"text.chunk","content":"的回答"}

event: text.completed
data: {"type":"text.completed","content":"這是 AI 的回答"}

event: iteration.completed
data: {"type":"iteration.completed","iteration":1,"has_next_iteration":false,"timestamp":"2025-11-03T10:00:05Z"}

event: conversation.completed
data: {"type":"conversation.completed","conversation_id":"conv_abc123","status":"success","token_usage":{"input_tokens":120,"output_tokens":85,"total_tokens":205},"timestamp":"2025-11-03T10:00:05Z"}
```

### SSE 事件格式

每個事件遵循以下格式：
```
event: <事件類型>
data: <JSON 資料>

```

**重要特性**（根據 `tests/integration/v4/response/streaming-event-flow.test.ts`）：
- 每個事件後有一個空行
- `data` 欄位必須是有效的 JSON
- **所有事件都包含 `type` 欄位**（與事件名稱相同）
- `text.chunk` 使用 `content` 欄位（而非 `text`）
- `text.completed` 包含完整的 `content`（所有 chunk 的組合）
- **不包含 `item_id`**（這是系統內部資訊，前端不需要處理）
- `conversation.completed` 包含 `token_usage` 統計資訊
- 前端使用 `EventSource` API 接收

---

### 客戶端事件類型

完整的事件類型定義請參考 `src/service/v4/types/client-events.ts`

#### 對話流程事件

| 事件類型 | 說明 | 主要欄位 |
|---------|------|---------|
| `conversation.started` | 對話開始 | `conversation_id`, `thread_id`, `timestamp` |
| `conversation.data` | 對話資料 | `user_msg_id`, `assistant_msg_id` |
| `conversation.error` | 對話錯誤 | `error_code`, `message`, `recoverable` |
| `conversation.canceled` | 對話取消 | `reason`, `canceled_at` |
| `conversation.timeout` | 對話逾時 | `timeout_type`, `timeout_seconds` |
| `conversation.completed` | 對話完成 | `conversation_id`, `status`, `token_usage` |
| `iteration.started` | 迭代開始 | `iteration`, `timestamp` |
| `iteration.completed` | 迭代完成 | `iteration`, `has_next_iteration` |

#### 模型狀態事件

| 事件類型 | 說明 | 主要欄位 |
|---------|------|---------|
| `model.in_progress` | 模型處理中 | - |

#### 文字輸出事件

| 事件類型 | 說明 | 主要欄位 |
|---------|------|---------|
| `text.started` | 文字輸出開始 | - |
| `text.chunk` | 文字片段 | `content` |
| `text.completed` | 文字輸出完成 | `content` (完整文字) |

#### Tool Call 事件

| 事件類型 | 說明 | 主要欄位 |
|---------|------|---------|
| `tool.preparing` | 工具準備中 | `call_id`, `name`, `timestamp` |
| `tool.call` | 工具調用 | `call_id`, `tool_type`, `name`, `arguments` |
| `tool.error` | 工具執行錯誤 | `call_id`, `tool_type`, `name`, `error_code`, `message` |
| `tool.result` | 工具執行結果 | `call_id`, `tool_type`, `name`, `success`, `output` |

#### Refusal 事件

| 事件類型 | 說明 | 主要欄位 |
|---------|------|---------|
| `refusal.started` | 拒絕回應開始 | `item_id` |
| `refusal.chunk` | 拒絕訊息片段 | `text`, `item_id` |
| `refusal.completed` | 拒絕回應完成 | `refusal`, `item_id` |

#### Reasoning 事件

| 事件類型 | 說明 | 主要欄位 |
|---------|------|---------|
| `reasoning.started` | 推理開始 | `item_id` |
| `reasoning.chunk` | 推理內容片段 | `text`, `item_id` |
| `reasoning.completed` | 推理完成 | `item_id` |

#### 搜尋事件

| 事件類型 | 說明 | 主要欄位 |
|---------|------|---------|
| `web_search.started` | Web 搜尋開始 | `item_id` |
| `web_search.completed` | Web 搜尋完成 | `item_id`, `results` |
| `file_search.started` | 檔案搜尋開始 | `item_id` |
| `file_search.completed` | 檔案搜尋完成 | `item_id`, `results` |

---

### 前端實作範例

#### 基本 SSE 監聽

```typescript
const eventSource = new EventSource('/v4/response?name=gpt-4o-mini&input=你好&stream=true');

// 監聽對話開始
eventSource.addEventListener('conversation.started', (event) => {
  const data = JSON.parse(event.data);
  console.log('對話開始:', data.conversation_id);
});

// 監聽文字片段
eventSource.addEventListener('text.chunk', (event) => {
  const data = JSON.parse(event.data);
  appendTextToUI(data.content); // ⚠️ 使用 content 欄位
});

// 監聽對話完成
eventSource.addEventListener('conversation.completed', (event) => {
  const data = JSON.parse(event.data);
  console.log('對話完成:', data.status);
  eventSource.close();
});

// 錯誤處理
eventSource.onerror = (error) => {
  console.error('SSE 連線錯誤:', error);
  eventSource.close();
};
```

#### 完整的聊天 UI 範例

```typescript
class ChatInterface {
  private eventSource: EventSource | null = null;
  private currentMessageElement: HTMLElement | null = null;

  async sendMessage(input: string, threadId?: number) {
    // 構建 URL
    const params = new URLSearchParams({
      name: 'gpt-4o-mini',
      input: input,
      stream: 'true'
    });
    if (threadId) {
      params.set('thread_id', threadId.toString());
    }

    // 建立 SSE 連線
    this.eventSource = new EventSource(`/v4/response?${params}`);

    // 監聽對話資料
    this.eventSource.addEventListener('conversation.data', (event) => {
      const data = JSON.parse(event.data);
      this.currentThreadId = data.thread_id; // 儲存 thread_id
    });

    // 監聽文字開始
    this.eventSource.addEventListener('text.started', (event) => {
      this.currentMessageElement = this.createMessageElement();
    });

    // 監聽文字片段
    this.eventSource.addEventListener('text.chunk', (event) => {
      const data = JSON.parse(event.data);
      this.appendText(data.content);  // ⚠️ 使用 content 欄位
    });

    // 監聽文字完成
    this.eventSource.addEventListener('text.completed', (event) => {
      this.finalizeMessage();
    });

    // 監聽對話完成
    this.eventSource.addEventListener('conversation.completed', (event) => {
      const data = JSON.parse(event.data);
      console.log('對話完成:', data.status);
      this.eventSource?.close();
      this.eventSource = null;
    });

    // 監聽錯誤
    this.eventSource.addEventListener('conversation.error', (event) => {
      const data = JSON.parse(event.data);
      this.showError(data.message);
      this.eventSource?.close();
    });

    // 連線錯誤
    this.eventSource.onerror = (error) => {
      console.error('SSE 錯誤:', error);
      this.showError('連線中斷，請重試');
      this.eventSource?.close();
    };
  }

  private createMessageElement(): HTMLElement {
    const elem = document.createElement('div');
    elem.className = 'message assistant';
    document.getElementById('messages')?.appendChild(elem);
    return elem;
  }

  private appendText(text: string) {
    if (this.currentMessageElement) {
      this.currentMessageElement.textContent += text;
    }
  }

  private finalizeMessage() {
    // 標記訊息完成
    this.currentMessageElement?.classList.add('completed');
    this.currentMessageElement = null;
  }

  private showError(message: string) {
    const elem = document.createElement('div');
    elem.className = 'message error';
    elem.textContent = `錯誤：${message}`;
    document.getElementById('messages')?.appendChild(elem);
  }
}
```

---

## 3️⃣ 錯誤回應

### HTTP 錯誤狀態碼

| 狀態碼 | 說明 | 何時發生 |
|-------|------|---------|
| `400 Bad Request` | 請求參數錯誤 | 缺少必填參數、格式錯誤 |
| `401 Unauthorized` | 未授權 | 缺少或無效的認證 token |
| `403 Forbidden` | 權限不足 | 無權存取該 preset 或 thread |
| `404 Not Found` | 資源不存在 | Preset 或 Thread 不存在 |
| `422 Unprocessable Entity` | 業務邏輯錯誤 | Thread 權限驗證失敗 |
| `429 Too Many Requests` | 請求過於頻繁 | Rate limit 超過限制 |
| `500 Internal Server Error` | 伺服器內部錯誤 | 系統異常 |
| `502 Bad Gateway` | AI 模型服務錯誤 | OpenAI/Gemini 等外部 AI 服務無回應 |
| `503 Service Unavailable` | 服務暫時不可用 | 系統維護或過載 |

---

### 錯誤回應格式

**Headers**:
```
HTTP/1.1 400 Bad Request
Content-Type: application/json
X-Request-ID: req_abc123xyz
```

**Body**:
```json
{
  "error": {
    "code": "invalid_request",
    "message": "缺少必填參數 'input'",
    "details": {
      "field": "input",
      "expected": "string | Message[]",
      "received": "undefined"
    },
    "request_id": "req_abc123xyz"
  }
}
```

#### 錯誤欄位說明

| 欄位 | 型別 | 說明 |
|------|------|------|
| `error.code` | string | 錯誤碼（見下表） |
| `error.message` | string | 使用者友好的錯誤訊息 |
| `error.details` | object | 錯誤詳細資訊（選填） |
| `error.request_id` | string | 請求 ID（用於追蹤） |

---

### 錯誤碼列表

完整的錯誤碼請參考 [error-codes.md](./error-codes.md)，以下是常見錯誤：

#### 請求相關錯誤（4xx）

| 錯誤碼 | HTTP Status | 說明 |
|-------|-------------|------|
| `invalid_request` | 400 | 請求格式錯誤 |
| `missing_parameter` | 400 | 缺少必填參數 |
| `invalid_parameter` | 400 | 參數值無效 |
| `unauthorized` | 401 | 未授權 |
| `forbidden` | 403 | 權限不足 |
| `not_found` | 404 | 資源不存在 |
| `thread_mismatch` | 422 | Thread 權限驗證失敗 |
| `rate_limit_exceeded` | 429 | 超過 rate limit |

#### 伺服器相關錯誤（5xx）

| 錯誤碼 | HTTP Status | 說明 |
|-------|-------------|------|
| `internal_error` | 500 | 系統內部錯誤 |
| `database_error` | 500 | 資料庫錯誤 |
| `provider_error` | 502 | AI 模型服務錯誤 |
| `service_unavailable` | 503 | 服務暫時不可用 |

---

### 錯誤回應範例

#### 缺少參數

```json
{
  "error": {
    "code": "missing_parameter",
    "message": "請求缺少必填參數",
    "details": {
      "missing_fields": ["input"],
      "hint": "必須提供 'name' 或 'model' 以及 'input' 參數"
    },
    "request_id": "req_abc123"
  }
}
```

#### Thread 權限錯誤

```json
{
  "error": {
    "code": "thread_mismatch",
    "message": "Thread 權限驗證失敗",
    "details": {
      "reason": "thread 的 ref_actor_id 與 user 不匹配",
      "thread_id": 456,
      "expected_actor": "user@example.com"
    },
    "request_id": "req_abc123"
  }
}
```

#### AI 模型服務錯誤

```json
{
  "error": {
    "code": "provider_error",
    "message": "模型服務暫時無法使用，請稍後再試",
    "details": {
      "service": "OpenAI",
      "service_error": "Service Unavailable (503)",
      "retryable": true,
      "retry_after": 30
    },
    "request_id": "req_abc123"
  }
}
```

---

### TypeScript 錯誤型別定義

```typescript
/**
 * 錯誤回應
 */
export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, any>;
    request_id: string;
  };
}

/**
 * 錯誤碼
 */
export type ErrorCode =
  // 請求錯誤
  | 'invalid_request'
  | 'missing_parameter'
  | 'invalid_parameter'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'thread_mismatch'
  | 'rate_limit_exceeded'
  // 伺服器錯誤
  | 'internal_error'
  | 'database_error'
  | 'provider_error'
  | 'service_unavailable';
```

---

## 4️⃣ Response Headers

所有回應都包含以下標準 Headers：

| Header | 說明 | 範例 |
|--------|------|------|
| `Content-Type` | 內容類型 | `application/json` 或 `text/event-stream` |
| `X-Request-ID` | 請求 ID（用於追蹤） | `req_abc123xyz` |
| `Cache-Control` | 快取控制（SSE 時為 `no-cache`） | `no-cache` |
| `Connection` | 連線類型（SSE 時為 `keep-alive`） | `keep-alive` |

---

## 5️⃣ 完整使用範例

### 範例 1：簡單查詢（非串流）

```typescript
async function simpleQuery() {
  const response = await fetch('/v4/response', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer prj_xxx.key_yyy',  // 你的 Project API Key
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'gpt-4o-mini',
      input: '台北的天氣如何？'
    })
  });

  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    console.error('錯誤:', error.error.message);
    return;
  }

  const result: NonStreamResponse = await response.json();
  console.log('AI 回答:', result.outputs[0].text);
  console.log('Thread ID:', result.thread_id); // 儲存以供多輪對話
  console.log('Message ID:', result.msg_id);
}
```

### 範例 2：多輪對話（非串流）

```typescript
async function multiTurnConversation() {
  // 第一輪
  const response1 = await fetch('/v4/response', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'gpt-4o-mini',
      input: '請記住我的名字是小明'
    })
  });
  const result1: NonStreamResponse = await response1.json();
  const threadId = result1.thread_id;
  console.log('第一輪:', result1.outputs[0].text);

  // 第二輪（使用同一個 thread）
  const response2 = await fetch('/v4/response', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      thread_id: threadId,
      input: '我叫什麼名字？'
    })
  });
  const result2: NonStreamResponse = await response2.json();
  console.log('第二輪:', result2.outputs[0].text); // "你叫小明"
}
```

### 範例 3：串流聊天（SSE）

```typescript
function streamingChat(input: string, threadId?: number) {
  const params = new URLSearchParams({
    name: 'gpt-4o-mini',
    input: input,
    stream: 'true'
  });
  if (threadId) {
    params.set('thread_id', threadId.toString());
  }

  const eventSource = new EventSource(`/v4/response?${params}`);
  let fullText = '';

  eventSource.addEventListener('text.chunk', (event) => {
    const data = JSON.parse(event.data);
    fullText += data.content;  // ⚠️ 使用 content 欄位
    updateUI(fullText); // 即時更新 UI
  });

  eventSource.addEventListener('conversation.completed', (event) => {
    console.log('完整回答:', fullText);
    eventSource.close();
  });

  eventSource.addEventListener('conversation.error', (event) => {
    const data = JSON.parse(event.data);
    showError(data.message);
    eventSource.close();
  });

  eventSource.onerror = () => {
    showError('連線中斷');
    eventSource.close();
  };
}
```

---

## 6️⃣ 最佳實踐

### 前端開發建議

#### ✅ 建議做法

1. **使用 TypeScript 型別**
   ```typescript
   import type { NonStreamResponse, ErrorResponse } from '@/types/api';
   ```

2. **統一錯誤處理**
   ```typescript
   async function callAPI(body: any): Promise<NonStreamResponse> {
     const response = await fetch('/v4/response', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(body)
     });

     if (!response.ok) {
       const error: ErrorResponse = await response.json();
       throw new APIError(error.error);
     }

     return response.json();
   }
   ```

3. **儲存 thread_id 以支援多輪對話**
   ```typescript
   const [threadId, setThreadId] = useState<number | null>(null);

   const result = await callAPI({ name: 'gpt-4o-mini', input: userInput, thread_id: threadId });
   setThreadId(result.thread_id); // 儲存以供下次使用
   ```

4. **SSE 連線管理**
   ```typescript
   useEffect(() => {
     const eventSource = new EventSource('/v4/response?...');
     // 監聽事件...

     return () => {
       eventSource.close(); // 清理連線
     };
   }, [dependency]);
   ```

#### ❌ 避免做法

1. **不要忽略錯誤處理**
   ```typescript
   // ❌ 錯誤
   const result = await fetch('/v4/response', { ... });
   const data = await result.json(); // 可能是錯誤回應

   // ✅ 正確
   if (!result.ok) {
     const error = await result.json();
     handleError(error);
     return;
   }
   ```

2. **不要在 SSE 中忘記關閉連線**
   ```typescript
   // ❌ 錯誤
   const eventSource = new EventSource('/v4/response?...');
   // 沒有 close()，導致連線洩漏

   // ✅ 正確
   eventSource.addEventListener('conversation.completed', () => {
     eventSource.close();
   });
   ```

3. **不要混淆串流和非串流模式**
   ```typescript
   // ❌ 錯誤
   const eventSource = new EventSource('/v4/response?stream=false');
   // stream=false 不應使用 EventSource

   // ✅ 正確
   const response = await fetch('/v4/response', {
     body: JSON.stringify({ stream: false, ... })
   });
   ```

---

## 7️⃣ 與 V3 的差異

### V4 改進

| 特性 | V3 | V4 |
|------|----|----|
| **錯誤格式** | 不一致 | 統一的 `ErrorResponse` 格式 |
| **conversation.data** | 陣列格式 | 直接物件格式（更直觀） |
| **對話狀態** | 無明確 `status` | `conversation.completed` 包含 `status` 欄位 |
| **事件架構** | 混亂 | 清晰的事件系統（標準化的客戶端事件） |

### 遷移建議

- **前端現有功能**：主要使用 `text.*` 事件，完全相容
- **新增功能**：可選擇性實作 `tool.*` 事件處理
- **向下相容**：不處理新事件也能正常運作

---

## 8️⃣ 常見問題

### Q1: 什麼時候使用串流模式？

**建議**：
- **聊天介面**：使用 SSE 串流（`stream: true`）
- **批次處理/後台任務**：使用非串流（`stream: false`）
- **簡單查詢**：使用非串流（更簡單）

---

### Q2: 如何處理 SSE 連線中斷？

```typescript
eventSource.onerror = (error) => {
  console.error('連線中斷:', error);
  eventSource.close();

  // 重試邏輯（指數退避）
  const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 30000);
  setTimeout(() => reconnect(), retryDelay);
};
```

---

### Q3: 如何追蹤錯誤？

使用 `X-Request-ID` Header：
```typescript
const response = await fetch('/v4/response', { ... });
const requestId = response.headers.get('X-Request-ID');

if (!response.ok) {
  const error = await response.json();
  console.error(`錯誤 [${requestId}]:`, error.error.message);
  // 將 requestId 提供給客服追蹤問題
}
```

---

## 📚 相關文件

- [Request 參數規格](./request.md) - 完整的請求參數說明
- [Events 事件規格](./events.md) - SSE 事件詳細定義
- [錯誤碼參考](./error-codes.md) - 完整錯誤碼列表
- [Input 格式詳解](./input.md) - Input 參數深入說明

---

**最後更新**：2025-11-03
**維護者**：如有更新請同步修改此文件
