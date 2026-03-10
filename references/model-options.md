# ModelOptions 完整參考

## 概述

`ModelOptions` 是 V4 API 的核心配置物件，包含所有模型相關的參數設定。

**來源**：
- **API 請求參數** - 部分參數可從 API 請求傳入（覆蓋 preset 設定）
- **Preset 配置** - 從資料庫 `preset.conf.{namespace}.modelOptions` 讀取

**合併規則**：
- 請求參數 > Preset 配置（請求參數優先）
- 最終合併結果傳給 `LlmProvider.call(input, options)`

---

## 通用屬性

以下屬性適用於所有 Provider（OpenAI、Gemini、Anthropic）。

### model

- **型別**: `string`
- **必填**: 是
- **來源**: 僅 Preset 配置
- **說明**: 模型 ID
- **範例**:
  - OpenAI: `"gpt-4o"`, `"gpt-4o-mini"`
  - Gemini: `"gemini-1.5-pro"`, `"gemini-1.5-flash"`
  - Anthropic: `"claude-sonnet-4-5"`, `"claude-haiku-4-5"`

---

### temperature

- **型別**: `number`
- **必填**: 否
- **範圍**: `0` ~ `2`（OpenAI）, `0` ~ `1`（Gemini, Anthropic）
- **預設**: 依 Provider 和模型而定
- **來源**: API 請求 或 Preset 配置
- **說明**: 採樣溫度，控制回應的創造性
  - `0`: 確定性輸出（適合事實性任務）
  - `1`: 平衡
  - `2`: 高度創造性（僅 OpenAI 支援）
- **注意**:
  - ⚠️ Anthropic 不支援同時設定 `temperature` 和 `top_p`
  - ⚠️ OpenAI 建議不要同時調整 `temperature` 和 `top_p`

---

### top_p

- **型別**: `number`
- **必填**: 否
- **範圍**: `0` ~ `1`
- **來源**: API 請求 或 Preset 配置
- **說明**: Nucleus sampling 參數
  - 控制採樣時考慮的 token 機率總和
  - 越小越確定，越大越多樣
- **注意**:
  - ⚠️ Anthropic 不支援同時設定 `temperature` 和 `top_p`
  - ⚠️ 建議擇一使用，不要同時調整

---

### max_tokens

- **型別**: `number`
- **必填**: 否
- **預設**:
  - OpenAI: 依模型而定（通常 4096）
  - Gemini: 8192
  - Anthropic: 4096
- **來源**: Preset 配置（不可從 API 傳入）
- **說明**: 生成回應的最大 token 數量
- **注意**: 超過會被截斷

---

### instructions

- **型別**: `string`
- **必填**: 否
- **來源**: API 請求 或 Preset 配置（Preset 中為 `system`）
- **說明**: 系統指令，定義 AI 的角色和行為
- **Context 模板**: 支援 ETA 模板語法（`<%=ctx.變數%>`）
- **Provider 對應**:
  - OpenAI: `instructions` 參數
  - Gemini: 轉換為第一條 `system` role message
  - Anthropic: `system` 參數
- **範例**:
  ```json
  {
    "instructions": "你是<%=ctx.school%>的 AI 助理"
  }
  ```

---

### system

- **型別**: `string`
- **必填**: 否
- **來源**: Preset 配置（Anthropic 專用）
- **說明**: Anthropic 的 system message（等同於 `instructions`）
- **注意**:
  - 在 Preset 配置中使用 `system`
  - 在 API 請求中使用 `instructions`
  - 兩者會合併（instructions 優先）

---

## Provider 特定屬性

### OpenAI 專用

#### reasoning

- **型別**: `Reasoning | null`
- **必填**: 否
- **來源**: 僅 Preset 配置
- **說明**: 推理設定，僅適用於 o-series 模型
- **型別定義**:
  ```typescript
  type Reasoning = {
    type: 'text';
    effort?: 'minimal' | 'low' | 'medium' | 'high';
  }
  ```
- **範例**:
  ```json
  {
    "reasoning": {
      "type": "text",
      "effort": "high"
    }
  }
  ```

---

### Anthropic 專用

#### top_k

- **型別**: `number`
- **必填**: 否
- **範圍**: `1` ~ `500`
- **來源**: Preset 配置
- **說明**: 限制每次採樣的候選詞彙數量
- **用途**: 控制輸出多樣性（K 值越小越集中）
- **注意**: 可選參數，通常不需要設定

---

#### enable_instruction_cache

- **型別**: `boolean`
- **必填**: 否
- **預設**: `false`
- **來源**: API 請求 或 Preset 配置
- **說明**: 啟用 Instruction Cache（Prompt Caching）
- **用途**: 快取 system instruction，節省 90% token 成本 + 改善 TTFT
- **優先級**: API 請求參數 > Preset 配置
- **使用建議**:
  - **單篇處理**: API 傳 `false`（避免 cache write 成本）
  - **批次處理**: API 傳 `true`（批改整班、多班時省錢 + 加速）
  - **Preset 預設**: 通常設為 `false`，由呼叫端決定
- **適用情境**:
  - ✅ 批次處理（整班 30 篇作文批改）
  - ✅ 多用戶共享系統（跨用戶自動共享 cache）
  - ✅ System instruction > 1024 tokens
- **成本效益**:
  - Cache Write: $3.75/M（第一次，比 input 貴 25%）
  - Cache Read: $0.30/M（第 2 次起，省 90%）
  - 無 Cache: $3.00/M
  - **整班 30 篇批改**: 平均每篇成本 = ($3.75 + 29 × $0.30) / 30 = $0.415/M（省 86%）
- **速度優勢**:
  - 改善 TTFT（Time to First Token）
  - 長 instruction（> 10K tokens）效果明顯
- **注意事項**:
  - Cache TTL: 5 分鐘無使用自動清除
  - 單篇低頻使用會虧錢（cache write 比一般 input 貴 25%）
  - Cache 跨用戶共享（同 API Key）
- **範例**（Preset 配置）:
  ```json
  {
    "Anthropic_Claude": {
      "modelOptions": {
        "system": "你是作文批改助手...(80K)",
        "enable_instruction_cache": false  // 預設關閉，由 API 控制
      }
    }
  }
  ```
- **範例**（API 請求）:
  ```json
  // 單篇批改（不用 cache）
  {
    "name": "essay-grader",
    "input": "批改這篇作文...",
    "enable_instruction_cache": false
  }

  // 整班批改（使用 cache）
  {
    "name": "essay-grader",
    "input": "批改這篇作文...",
    "enable_instruction_cache": true
  }
  ```
- **詳見**: [Anthropic Prompt Caching 文件](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)

---

## 只能在 Preset 配置的屬性

以下屬性**不能**從 API 請求傳入，只能在 Preset 配置中設定。

### tools

- **型別**: `Tool[]`
- **必填**: 否
- **來源**: Preset 配置（從 function_definition 表載入）
- **說明**: Function Call 工具定義
- **設計理念**:
  - Tools 由 Preset 統一管理
  - 前端透過不同 `name`（preset 名稱）使用不同的 tools
  - 避免前端處理不同 Provider 的格式差異
- **注意**: V4 不支援從 API 請求動態傳入 tools

---

### response_format

- **型別**: `object`
- **必填**: 否
- **來源**: Preset 配置
- **說明**: 回應格式控制（如 JSON mode）
- **範例**（OpenAI）:
  ```json
  {
    "response_format": { "type": "json_object" }
  }
  ```

---

## V4 不支援的參數

以下 OpenAI Response API 參數在 V4 中**不支援**：

❌ `tool_choice` - Tools 由 Preset 管理，不支援動態控制
❌ `modalities` - V4 暫不支援音訊輸出
❌ `audio` - V4 暫不支援音訊配置
❌ `metadata` - V4 使用自己的 metadata 機制

---

## API 請求參數 vs Preset 配置對照

| 屬性 | API 請求 | Preset 配置 | 優先級 |
|------|---------|------------|--------|
| `input` | ✅ | ❌ | API only |
| `instructions` | ✅ | ✅ (`system`) | API > Preset |
| `temperature` | ✅ | ✅ | API > Preset |
| `top_p` | ✅ | ✅ | API > Preset |
| `stream` | ✅ | ✅ | API > Preset |
| `enable_instruction_cache` | ✅ | ✅ | API > Preset |
| `model` | ❌ | ✅ | Preset only |
| `tools` | ❌ | ✅ | Preset only |
| `reasoning` | ❌ | ✅ | Preset only |
| `store` | ❌ | ✅ | Preset only |
| `max_tokens` | ❌ | ✅ | Preset only |
| `top_k` | ❌ | ✅ | Preset only |
| `response_format` | ❌ | ✅ | Preset only |

---

## 配置範例

### 範例 1: OpenAI Preset 配置

```json
{
  "OpenAI_Response": {
    "apiKey": "sk-proj-xxxxx",
    "modelOptions": {
      "model": "gpt-4o-mini",
      "temperature": 0.7,
      "max_tokens": 4096,
      "instructions": "你是 AI 助理"
    }
  }
}
```

### 範例 2: Anthropic Preset 配置（含 Prompt Cache）

```json
{
  "Anthropic_Claude": {
    "apiKey": "sk-ant-xxxxx",
    "modelOptions": {
      "model": "claude-sonnet-4-5",
      "temperature": 1.0,
      "max_tokens": 4096,
      "top_k": 40,
      "system": "你是作文批改助手，擅長...(80K tokens)",
      "enable_instruction_cache": true
    }
  }
}
```

### 範例 3: API 請求覆蓋 Preset 設定

```typescript
// Preset 配置
{
  "modelOptions": {
    "model": "gpt-4o-mini",
    "temperature": 0.7,
    "instructions": "你是 AI 助理"
  }
}

// API 請求
{
  "name": "gpt-4o-mini",
  "input": "你好",
  "temperature": 0.9,  // ← 覆蓋 preset 的 0.7
  "instructions": "你是友善的助理"  // ← 覆蓋 preset
}

// 最終 ModelOptions
{
  "model": "gpt-4o-mini",           // ← 來自 Preset（API 不可傳入）
  "temperature": 0.9,               // ← 來自 API
  "instructions": "你是友善的助理",  // ← 來自 API
  "max_tokens": 4096                // ← 來自 Preset（API 不可傳入）
}
```

---

## 使用建議

### 1. 參數分工

**Preset 配置**（穩定的設定）:
- ✅ `model` - 模型選擇
- ✅ `tools` - Function Call 工具定義
- ✅ `reasoning` - o-series 推理設定
- ✅ `store` - 是否儲存請求
- ✅ `max_tokens` - 輸出長度限制
- ✅ `top_k` - 進階採樣參數（Anthropic）
- ✅ `system` / `instructions` - 基礎角色設定
- ✅ `response_format` - 回應格式控制

**API 請求**（動態調整）:
- ✅ `input` - 每次請求的輸入內容
- ✅ `instructions` - 動態的情境化指令（配合 context）
- ✅ `temperature` - 根據任務調整創造性
- ✅ `top_p` - 動態調整採樣多樣性
- ✅ `stream` - 選擇是否使用串流回應
- ✅ `enable_instruction_cache` - 批次處理時啟用快取

### 2. 成本優化

**啟用 Prompt Cache 的時機**:
```json
{
  "enable_instruction_cache": true
}
```

**適用**:
- 批次處理（一次處理多筆）
- 多用戶共享（10+ 用戶）
- 長 instruction（> 1024 tokens）

**不適用**:
- 單用戶低頻使用
- 每次間隔 > 5 分鐘

### 3. Provider 差異處理

**Anthropic 特殊限制**:
```json
{
  // ❌ 錯誤：不能同時設定
  "temperature": 0.7,
  "top_p": 0.9
}

{
  // ✅ 正確：擇一使用
  "temperature": 0.7
}
```

---

## 相關文件

- **[Request 參數規格](./request.md)** - 了解哪些參數可從 API 傳入
- **[配置系統](../concepts/configuration.md)** - 了解三層配置繼承機制
- **[Provider 開發指南](../guides/llm-provider-guide.md)** - 了解 Provider 如何使用 ModelOptions

---

**最後更新**: 2025-11-11
