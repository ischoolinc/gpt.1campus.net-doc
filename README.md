# V4 API 文件索引

本目錄包含 V4 API 的完整規格文件，專為前端開發者設計。

---

## 🎯 快速開始

### 第一步：取得 API Key

V4 API 使用 **Project API Key** 進行認證。格式為：

```
prj_<project_code>.key_<random_string>
```

**範例**：
```
prj_abc123xyz.key_ExampleKeyDoNotUseInProduction1234567890
```

**如何取得**：
1. 登入 1Campus GPT 平台
2. 進入你的 Project 設定
3. 在「API Keys」頁面產生新的 API Key
4. 妥善保管你的 API Key（不要提交到版本控制）

---

### 第二步：發送第一個請求

```bash
curl --request POST \
  --url https://your-domain.com/v4/response \
  --header 'Authorization: Bearer prj_xxx.key_yyy' \
  --header 'Content-Type: application/json' \
  --data '{
    "name": "gpt-4o-mini",
    "input": "你好，請自我介紹"
  }'
```

**重要**：
- 使用 `Authorization: Bearer <your-api-key>` header
- API Key 前面要加 `Bearer ` 前綴
- Content-Type 必須是 `application/json`

---

### 進階：使用 Context 模板

Context 模板讓你可以動態替換 prompt 中的變數，非常適合客製化對話情境。

```bash
curl --request POST \
  --url https://your-domain.com/v4/response \
  --header 'Authorization: Bearer prj_xxx.key_yyy' \
  --header 'Content-Type: application/json' \
  --data '{
    "name": "gpt-4o-mini",
    "input": "今天的課表是什麼？",
    "instructions": "你是<%=ctx.school%>的 AI 助理，請協助<%=ctx.user_name%>。",
    "context": {
      "school": "台灣大學",
      "user_name": "王小明"
    }
  }'
```

**處理結果**：
- `instructions` 會被處理成：`"你是台灣大學的 AI 助理，請協助王小明。"`
- 模型會基於客製化的指令來回應

**模板語法**：
- 基本變數：`<%=ctx.user_name%>`
- 巢狀物件：`<%=ctx.student.school.name%>`
- 條件判斷：`<% if (ctx.role === "teacher") { %>您是老師<% } %>`

**注意**：
- ⚠️ 變數必須使用 `ctx.` 前綴
- 只處理 `instructions` 和 system role 的 messages
- 詳細說明請參考 [Request 參數規格 - context](./request.md#context)

---

### 第三步：閱讀文件

1. **[Request 參數規格](./request.md)** - 了解所有可用的請求參數
2. **[Response 格式規格](./response.md)** - 了解 API 回應格式
3. **[Events 事件規格](./events.md)** - 了解 SSE 串流事件

---

## 📚 完整文件列表

### 核心規格

#### [Request 參數規格](./request.md)
- **內容**：V4 API 請求參數的完整定義
- **包含**：
  - 基本參數（`name`, `thread_id`, `user`, `context`, `credential`）
  - 模型參數（`input`, `instructions`, `temperature`, `top_p`, `stream`, `enable_instruction_cache`）
  - 參數約束規則
- **適合**：需要了解如何構建 API 請求的開發者

#### [ModelOptions 完整參考](./model-options.md) ⭐ 重要
- **內容**：所有 ModelOptions 屬性的詳細說明
- **包含**：
  - 通用屬性（`model`, `temperature`, `top_p`, `max_tokens`, `instructions`）
  - Provider 特定屬性（`top_k`, `enable_instruction_cache`, `reasoning`）
  - API 請求 vs Preset 配置對照表
  - 成本優化建議（Prompt Cache）
- **適合**：需要了解完整配置選項的開發者

#### [Response 格式規格](./response.md)
- **內容**：V4 API 回應格式的完整定義
- **包含**：
  - 非串流模式回應格式（`stream: false`）
  - SSE 串流模式回應格式（`stream: true`）
  - HTTP 狀態碼和錯誤處理
  - Response Headers 說明
  - TypeScript 型別定義
- **適合**：需要處理 API 回應的前端開發者

#### [Events 事件規格](./events.md)
- **內容**：SSE 串流事件的完整定義
- **包含**：
  - **Unified Event Protocol (UEP)** 三層事件架構（Provider 原始事件 → StandardEvent → ClientEvent）
  - 所有客戶端事件類型（`conversation.*`, `text.*`, `tool.*`, `reasoning.*` 等）
  - 事件流程不變式（Invariants）
  - 對話暫停/恢復機制
  - 錯誤處理機制
- **適合**：需要實作 SSE 串流處理的前端開發者

---

### 詳細說明

#### [Context 模板語法指南](./context-template.md)
- **內容**：Context 參數的模板語法使用指南
- **包含**：
  - 基本模板語法（`<%=ctx.變數%>`）
  - 支援的變數類型（字串、數字、物件、陣列）
  - 替換位置說明（instructions、input messages）
  - 安全機制（Proxy 防護、AST 分析）
  - 完整使用範例
- **適合**：需要動態客製化提示詞的開發者

#### [Input 格式詳解](./input.md)
- **內容**：`input` 參數的深入說明
- **包含**：
  - 三種 Input 格式（純文字、Messages 陣列、多模態）
  - 資料庫儲存規範
  - Provider 格式轉換
  - 多輪對話處理流程
- **適合**：需要深入了解 input 參數處理的開發者

#### [錯誤碼參考](./error-codes.md)
- **內容**：完整的錯誤碼列表
- **包含**：
  - HTTP 狀態碼
  - 業務錯誤碼
  - 錯誤訊息範例
  - 錯誤處理建議
- **適合**：需要實作錯誤處理的開發者

#### [Client-side Function Call 指南](./client-function-call.md) ⭐ 新增
- **內容**：讓 AI 控制前端 UI 的完整指南
- **包含**：
  - 兩輪 HTTP 請求流程
  - `tool.execute` 和 `conversation.paused` 事件規格
  - `tool_outputs` 請求格式
  - 完整 TypeScript/Angular 實作範例
  - 錯誤處理和常見問題
- **適合**：需要實作 AI 控制 UI 功能的前端開發者

---

## 🔧 常見使用場景

### 場景 1：發起簡單對話
```typescript
// 參考：request.md
const response = await fetch('/v4/response', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer prj_xxx.key_yyy',  // 你的 API Key
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'gpt-4o-mini',
    input: '你好，請介紹一下自己'
  })
});

// 參考：response.md
const result = await response.json();
console.log(result.outputs[0].text); // AI 回應
```

### 場景 2：使用 SSE 串流
```typescript
// ⚠️ 注意：EventSource 不支援自訂 headers
// 方法 1：使用 POST + fetch (推薦)
const response = await fetch('/v4/response', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer prj_xxx.key_yyy',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'gpt-4o-mini',
    input: '寫一首詩',
    stream: true
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  // 處理 SSE 事件...
}

// 方法 2：使用 EventSource + URL 參數（如果後端支援）
// const eventSource = new EventSource(
//   `/v4/response?api_key=prj_xxx.key_yyy&name=gpt-4o-mini&input=寫一首詩&stream=true`
// );
```

### 場景 3：多輪對話
```typescript
const headers = {
  'Authorization': 'Bearer prj_xxx.key_yyy',
  'Content-Type': 'application/json'
};

// 第一輪對話
const response1 = await fetch('/v4/response', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    name: 'gpt-4o-mini',
    input: '請記住我的名字是小明'
  })
});
const result1 = await response1.json();
const threadId = result1.thread_id;

// 第二輪對話（使用同一個 thread）
const response2 = await fetch('/v4/response', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    thread_id: threadId,
    input: '我叫什麼名字？'
  })
});
// AI 會記得：「你叫小明」
```

### 場景 4：Client-side Function Call（AI 控制 UI）
```typescript
// 參考：client-function-call.md
// 當 AI 需要操作前端 UI 時，會發送 tool.execute 事件

// 1. 定義 client tool handlers
const toolHandlers = {
  set_temperature: async ({ value }) => {
    document.getElementById('temp-input').value = value;
    return { success: true, new_value: value };
  }
};

// 2. 監聽 conversation.paused 事件
eventSource.addEventListener('conversation.paused', async (e) => {
  const { reason, pending_tools, thread_id } = JSON.parse(e.data);
  if (reason !== 'client_tool_execution') return;

  // 3. 執行所有 pending tools
  const results = [];
  for (const tool of pending_tools) {
    const handler = toolHandlers[tool.name];
    const result = handler
      ? await handler(JSON.parse(tool.arguments))
      : { success: false, error: 'Unknown tool' };
    results.push({ call_id: tool.call_id, output: JSON.stringify(result) });
  }

  // 4. 發起第二輪請求，恢復對話
  await fetch('/v4/response', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer prj_xxx.key_yyy', 'Content-Type': 'application/json' },
    body: JSON.stringify({ thread_id, tool_outputs: results, stream: true })
  });
});
```

---

## 📖 延伸閱讀

如果你想深入了解系統架構，可以參考：
- `../design-overview.md` - V4 整體設計概覽
- `../architecture-diagrams.md` - 系統架構圖
- `../event-flow-diagrams.md` - 事件流程圖

**注意**：以上文件是給後端開發者和系統架構師看的，前端開發通常不需要閱讀

---

## 🔄 版本記錄

- **2025-12-16**: 新增 Client-side Function Call 指南
- **2025-11-28**: 補充 Context 模板語法指南
- **2025-11-03**: 建立 API 文件索引，重組文件結構
- **2025-11-01**: 新增 Input 格式詳解
- **2025-10-21**: 建立 Request 參數規格和 Events 事件規格

---

## 💡 提示

- 所有 API 都遵循 **OpenAI Response API** 標準格式
- 前端只需要關注**客戶端事件**（`conversation.*`, `text.*`, `tool.*` 等）
- 系統內部的技術細節對前端透明，無需了解
- 遇到問題可參考各文件中的「常見錯誤」和「使用範例」章節

---

**Happy Coding!** 🎉
