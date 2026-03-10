---
name: gpt-client-api
description: V4 Client API 使用指南。1Campus GPT V4 API 的第三方開發者文件，涵蓋 Request/Response 規格、SSE 串流事件、Client Function Call、Context 模板、錯誤處理。當討論 V4 API 呼叫方式、串流實作、事件處理、前端整合、API 請求格式、error codes、tool_outputs、二階段 API、EventSource 時使用此 Skill。與 gpt-v4-arch（內部架構）互補，本 Skill 專注於外部 Client 端使用方式。
---

# V4 Client API 指南

## 行動指引

**當主公詢問 V4 Client API 相關問題時：**

1. **先查下方索引**找到對應的 references 文件
2. **用 Read 工具讀取**該文件取得完整說明與範例
3. **基於文件內容回答**，不要只憑 Skill 摘要

| 主公可能問的問題 | 讀取的文件 |
|-----------------|-----------|
| API 怎麼呼叫？快速開始？ | `references/quickstart.md` |
| Request 參數有哪些？ | `references/request.md` |
| Response 格式？型別定義？ | `references/response.md` |
| SSE 事件怎麼處理？ | `references/events.md` + `references/events/` 子目錄 |
| 錯誤碼？重試策略？ | `references/error-codes.md` |
| Client Function Call？tool_outputs？ | `references/client-function-call.md` |
| Context 模板語法？動態變數？ | `references/context-template.md` |
| Input 格式？多模態？messages？ | `references/input.md` |
| 模型參數？temperature？cache？ | `references/model-options.md` |
| Title 生成 API？ | `references/title-generation.md` |

## API 概覽

- **Base URL**: `https://gpt.1campus.net`
- **認證**: `Authorization: Bearer <api-key>`（格式：`prj_<code>.key_<random>`）
- **Content-Type**: `application/json`

### Endpoints

| 方法 | 路徑 | 用途 |
|------|------|------|
| `POST` | `/v4/response` | 單階段 API（同步/串流） |
| `POST` | `/v4/prepare` | 二階段：取得 run_token |
| `GET` | `/v4/response/:run_token` | 二階段：前端串流（無需 API Key） |

### 使用模式

- **單階段**：後端 server-to-server，支援串流和非串流
- **二階段**：後端取 token → 前端用 EventSource 串流（解決瀏覽器 Header 限制）

### Request 快速參考

```typescript
{
  name?: string;           // Preset 名稱
  thread_id?: number;      // 延續對話
  user?: string;           // 使用者識別
  context?: object;        // 模板變數（ctx. 前綴）
  credential?: object;     // FC 認證資訊
  input: PromptInput;      // 必填：字串或 Messages 陣列
  instructions?: string;   // 覆蓋 system prompt
  model?: string;          // 覆蓋模型
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  tool_outputs?: Array<{ call_id: string; output: string }>;  // Client FC 回傳
}
```

## SSE 事件快速參考

```
conversation.started → text.started → text.chunk (xN) → text.completed → conversation.completed
```

完整事件列表：

| 類型 | 事件 | 文件 |
|------|------|------|
| 對話生命週期 | `conversation.started/paused/resumed/completed/error` | `references/events/conversation-events.md` |
| 文字輸出 | `text.started/chunk/completed` | `references/events/text-events.md` |
| 工具呼叫 | `tool.start/execute/complete` | `references/events/tool-events.md` |
| 推理過程 | `reasoning.started/chunk/completed` | `references/events/reasoning-events.md` |
| 搜尋 | `web_search.*/file_search.*` | `references/events/search-events.md` |
| 迭代 | `iteration.started/completed` | `references/events/iteration-events.md` |

## 文件索引

所有文件路徑相對於本 Skill 目錄：

### 核心規格
- `references/quickstart.md` - 快速入門、基本範例
- `references/request.md` - Request 參數完整規格
- `references/response.md` - Response 格式、TypeScript 型別
- `references/error-codes.md` - 錯誤碼、重試策略

### 串流事件
- `references/events.md` - 事件總索引
- `references/events/overview.md` - 三層事件架構（Provider → Standard → Client）
- `references/events/design-principles.md` - 設計原則
- `references/events/text-events.md` - 文字事件
- `references/events/tool-events.md` - 工具事件（含 Client FC）
- `references/events/reasoning-events.md` - 推理事件
- `references/events/search-events.md` - 搜尋事件
- `references/events/conversation-events.md` - 對話生命週期事件
- `references/events/iteration-events.md` - 迭代事件

### 進階功能
- `references/client-function-call.md` - Client-side Function Call（AI 控制前端 UI）
- `references/context-template.md` - Context 模板語法
- `references/input.md` - Input 格式（多模態、messages）
- `references/model-options.md` - 模型參數完整參考
- `references/title-generation.md` - 對話標題生成 API
