# V4 Response API 參數規格

## 概述

本文檔定義 V4 Response API 的完整參數規格。

---

## 請求參數

### name

- **型別**: `string`
- **必填**: 是
- **說明**: Preset 名稱，用於選擇 AI 助理配置
- **範例**: `"gpt-4o-mini"`, `"tutor-assistant"`

### thread_id

- **型別**: `number`
- **必填**: 否
- **預設**: 自動建立新 thread
- **說明**: 對話串 ID，用於多輪對話

### user

- **型別**: `string`
- **必填**: 否
- **說明**: 使用者識別碼（email 格式）
- **範例**: `"student@example.com"`

### context

- **型別**: `Record<string, any>`
- **必填**: 否
- **說明**: 上下文變數，可透過模板語法（`<%=ctx.變數名%>`）合併到 prompt
- **範例**:
  ```json
  {
    "instructions": "你是<%=ctx.school%>的 AI 助理",
    "context": {
      "school": "台灣大學"
    }
  }
  ```

### credential

- **型別**: `Record<string, any>`
- **必填**: 否
- **說明**: 認證資訊，用於 Function Call 權限驗證

### input

- **型別**: `string | Message[]`
- **必填**: 是
- **說明**: 輸入內容，可以是純文字或 OpenAI 格式的訊息陣列
- **格式**:
  - **字串**: 直接作為 user message
  - **陣列**: OpenAI Message 格式（見下方定義）

#### Message 型別定義

```typescript
type Message = {
  role: 'user' | 'assistant' | 'system' | 'developer';
  content: string | ContentPart[];
}

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
```

### instructions

- **型別**: `string`
- **必填**: 否
- **說明**: 系統指令內容
- **優先級**: 請求參數覆蓋 preset 設定

### temperature

- **型別**: `number`
- **必填**: 否
- **範圍**: `0` ~ `2`
- **說明**: 採樣溫度（越高越隨機，越低越確定）

### top_p

- **型別**: `number`
- **必填**: 否
- **範圍**: `0` ~ `1`
- **說明**: Nucleus sampling 參數

### stream

- **型別**: `boolean`
- **必填**: 否
- **預設**: `false`
- **說明**: 是否使用串流回應（Server-Sent Events）

### tool_outputs

- **型別**: `ClientToolOutput[]`
- **必填**: 否
- **說明**: Client-side function 執行結果，用於恢復暫停的對話
- **使用時機**: 收到 `conversation.paused` 事件（`reason: 'client_tool_execution'`）後，前端執行完 UI 操作，發起第二輪請求時帶上此參數

#### ClientToolOutput 型別定義

```typescript
interface ClientToolOutput {
  /** 對應 tool.execute 事件的 call_id */
  call_id: string;
  /** 執行結果（JSON 字串） */
  output: string;
}
```

#### 使用範例

```json
{
  "thread_id": 42,
  "tool_outputs": [
    {
      "call_id": "call_123",
      "output": "{\"success\": true, \"new_value\": 0.8}"
    }
  ]
}
```

#### 設計原則

**前端只需提供最少資訊**：

| 欄位 | 必填 | 說明 |
|------|------|------|
| `thread_id` | ✅ | 哪個對話 |
| `tool_outputs[].call_id` | ✅ | 對應哪個 tool.execute |
| `tool_outputs[].output` | ✅ | 執行結果 JSON |
| `input` | ❌ | **不需要**，後端看到 `tool_outputs` 就知道是恢復對話 |
| `name` | ❌ | **不需要**，後端用 `call_id` 查詢 |

#### 錯誤回報

執行失敗時，將錯誤放在 `output` 的 JSON 內：

```json
{
  "thread_id": 42,
  "tool_outputs": [
    {
      "call_id": "call_123",
      "output": "{\"success\": false, \"error\": \"找不到指定的 UI 元素\"}"
    }
  ]
}
```

#### 後端驗證

後端會驗證以下項目（前端不需處理）：

| 驗證項目 | 錯誤情況 |
|---------|---------|
| `call_id` 存在 | 該 `call_id` 不存在於此 `thread_id` |
| 是 client-side function | 該 function 的 `impl_type` 不是 `'client'` |
| 尚未處理 | 該 `call_id` 已經回傳過結果 |

> 📖 詳細設計請參考：[Client-side Function Call 設計](../tool_client_docs/client-side-function-call.md)

### enable_instruction_cache

- **型別**: `boolean`
- **必填**: 否
- **說明**: 是否啟用 Instruction Cache（僅 Anthropic）
- **使用情境**:
  - 單篇處理：`false`（避免 cache write 成本）
  - 批次處理：`true`（第 2 篇起省 90% 成本）

---

## 參數約束規則

### 必填參數組合

**一般對話（新對話/延續對話）**：
- `name` + `input`

**恢復暫停的對話（Client-side Function Call 第二輪）**：
- `thread_id` + `tool_outputs`
- 不需要 `name` 和 `input`

### 參數覆蓋

- 請求參數可覆蓋 preset 設定：`temperature`、`top_p`、`stream`、`enable_instruction_cache`
- 其他配置（`model`、`tools`、`reasoning`、`store` 等）統一在 Preset 設定

### Thread 權限驗證

如果同時提供 `user` 和 `thread_id`：
1. Thread 必須存在
2. Thread 的 `ref_actor_id` 必須匹配 `user` 對應的 actor_id
3. Thread 的 `ref_project_id` 和 `ref_current_preset_id` 必須匹配

