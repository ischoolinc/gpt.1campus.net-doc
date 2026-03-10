# V4 錯誤碼標準

## 設計原則

- **精簡實用**：只定義實際會遇到的錯誤
- **易於理解**：錯誤碼和訊息清晰明確
- **統一格式**：所有錯誤使用相同的回應結構
- **可重試標記**：明確標示哪些錯誤可以重試

## 實作狀態總覽

### ✅ 已實作並使用的錯誤碼

#### 通用錯誤碼
- `INVALID_REQUEST` - 請求格式錯誤
- `THREAD_NOT_FOUND` - 找不到指定的 thread
- `INTERNAL_ERROR` - 系統內部錯誤

#### 模型相關錯誤碼
- `MODEL_ERROR` - 模型調用失敗
- `MODEL_TIMEOUT` - 模型回應超時
- `MODEL_RATE_LIMIT` - 超過速率限制
- `INVALID_MODEL_CONFIG` - 模型配置錯誤

#### Tool 相關錯誤碼
- `TOOL_EXECUTION_ERROR` - Tool 執行失敗

#### Resume API 專用錯誤碼
- `NOT_FOUND` - 找不到對應的執行記錄
- `ALREADY_RUNNING` - 該請求正在執行中
- `ALREADY_COMPLETED` - 該請求已完成
- `INVALID_PAYLOAD` - 執行記錄格式無效

### ⚠️ 未實作的錯誤碼（規劃中）
- `INVALID_EMAIL_FORMAT` - Email 格式驗證（尚未實際使用）
- `PRESET_NOT_FOUND` - Preset 不存在檢查（尚未實際使用）
- `THREAD_PERMISSION_DENIED` - Thread 權限檢查（尚未實際使用）
- `DATABASE_ERROR` - 資料庫錯誤（目前使用 INTERNAL_ERROR）

### 🔮 Phase 6 規劃功能（Tool 批准機制）
- `INVALID_TOOL_RESULTS` - tool_results 格式驗證
- `TOOL_APPROVAL_DENIED` - 使用者拒絕執行 tool
- `conversation.paused` / `conversation.resumed` 事件
- `tool.approved` / `tool.denied` 事件

---

## 錯誤回應格式

所有錯誤都使用統一的 JSON 格式回傳：

```json
{
  "error": {
    "code": "PRESET_NOT_FOUND",
    "message": "找不到指定的 preset",
    "details": {
      "name": "gpt-4o-mini"
    },
    "retryable": false
  }
}
```

**欄位說明**：
- `code`: 錯誤代碼（大寫英文，底線分隔）
- `message`: 人類可讀的錯誤訊息（繁體中文）
- `details`: 錯誤的詳細資訊（可選）
- `retryable`: 是否可重試（boolean）

---

## 錯誤碼定義

### 1. 請求參數錯誤（4xx 系列）

#### INVALID_REQUEST
- **HTTP Status**: 400
- **訊息**: 請求格式錯誤
- **可重試**: ❌ No
- **觸發情境**:
  - 缺少必填參數（`name` 和 `model` 都沒提供）
  - 缺少 `input` 參數
  - JSON 格式錯誤
- **範例**:
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "請求格式錯誤：缺少必填參數",
    "details": {
      "missing_fields": ["input"]
    },
    "retryable": false
  }
}
```

#### INVALID_EMAIL_FORMAT
> ⚠️ **未實作**：目前尚未實際使用此錯誤碼

- **HTTP Status**: 400
- **訊息**: Email 格式錯誤
- **可重試**: ❌ No
- **觸發情境**: `user` 欄位不符合 email 格式（尚未實作）
- **範例**:
```json
{
  "error": {
    "code": "INVALID_EMAIL_FORMAT",
    "message": "Email 格式錯誤",
    "details": {
      "user": "invalid-email"
    },
    "retryable": false
  }
}
```

#### PRESET_NOT_FOUND
> ⚠️ **未實作**：目前尚未實際使用此錯誤碼

- **HTTP Status**: 404
- **訊息**: 找不到指定的 preset
- **可重試**: ❌ No
- **觸發情境**: `name` 或 `model` 指定的 preset 不存在（尚未實作）
- **範例**:
```json
{
  "error": {
    "code": "PRESET_NOT_FOUND",
    "message": "找不到指定的 preset",
    "details": {
      "name": "non-existent-preset"
    },
    "retryable": false
  }
}
```

#### THREAD_NOT_FOUND
- **HTTP Status**: 404
- **訊息**: 找不到指定的 thread
- **可重試**: ❌ No
- **觸發情境**: `thread_id` 指定的對話串不存在
- **範例**:
```json
{
  "error": {
    "code": "THREAD_NOT_FOUND",
    "message": "找不到指定的 thread",
    "details": {
      "thread_id": 12345
    },
    "retryable": false
  }
}
```

#### THREAD_PERMISSION_DENIED
> ⚠️ **未實作**：目前尚未實際使用此錯誤碼

- **HTTP Status**: 403
- **訊息**: 無權存取此 thread
- **可重試**: ❌ No
- **觸發情境**:
  - Thread 的 `ref_actor_id` 與 `user` 不匹配（尚未實作）
  - Thread 的 `ref_project_id` 不匹配（尚未實作）
  - Thread 的 `ref_current_preset_id` 不匹配（尚未實作）
- **範例**:
```json
{
  "error": {
    "code": "THREAD_PERMISSION_DENIED",
    "message": "無權存取此 thread",
    "details": {
      "thread_id": 123,
      "reason": "ref_actor_id 不匹配"
    },
    "retryable": false
  }
}
```

#### INVALID_TOOL_RESULTS
> ⚠️ **未實作功能**：此錯誤碼為 Phase 6 規劃的「Tool 批准機制」，目前尚未實作

- **HTTP Status**: 400
- **訊息**: tool_results 格式錯誤
- **可重試**: ❌ No
- **觸發情境**:
  - `tool_results` 缺少必要欄位（尚未實作）
  - `call_id` 找不到對應的 pending tool call（尚未實作）
- **範例**:
```json
{
  "error": {
    "code": "INVALID_TOOL_RESULTS",
    "message": "tool_results 格式錯誤",
    "details": {
      "missing_field": "call_id"
    },
    "retryable": false
  }
}
```

---

### 2. 模型相關錯誤（5xx 系列）

#### MODEL_ERROR
- **HTTP Status**: 500
- **訊息**: 模型調用失敗
- **可重試**: ✅ Yes
- **觸發情境**:
  - OpenAI/Gemini/Claude API 回傳錯誤
  - 網路連線問題
  - 暫時性故障
- **重試策略**: 最多 3 次，指數退避（1s, 2s, 4s）
- **範例**:
```json
{
  "error": {
    "code": "MODEL_ERROR",
    "message": "模型調用失敗",
    "details": {
      "provider": "openai",
      "error_message": "Connection timeout"
    },
    "retryable": true
  }
}
```

#### MODEL_TIMEOUT
- **HTTP Status**: 504
- **訊息**: 模型回應超時
- **可重試**: ✅ Yes
- **觸發情境**: 模型調用超過設定的 timeout 時間
- **重試策略**: 最多 3 次，指數退避（1s, 2s, 4s）
- **範例**:
```json
{
  "error": {
    "code": "MODEL_TIMEOUT",
    "message": "模型回應超時",
    "details": {
      "timeout_seconds": 60
    },
    "retryable": true
  }
}
```

#### MODEL_RATE_LIMIT
- **HTTP Status**: 429
- **訊息**: 超過速率限制
- **可重試**: ✅ Yes
- **觸發情境**: Provider 回傳 rate limit 錯誤
- **重試策略**: 等待 Provider 建議的時間後重試
- **範例**:
```json
{
  "error": {
    "code": "MODEL_RATE_LIMIT",
    "message": "超過速率限制",
    "details": {
      "retry_after_seconds": 60
    },
    "retryable": true
  }
}
```

#### INVALID_MODEL_CONFIG
- **HTTP Status**: 500
- **訊息**: 模型配置錯誤
- **可重試**: ❌ No
- **觸發情境**:
  - Preset 中的 Provider 配置缺少必要欄位
  - API Key 未設定
- **範例**:
```json
{
  "error": {
    "code": "INVALID_MODEL_CONFIG",
    "message": "模型配置錯誤",
    "details": {
      "reason": "缺少 API Key"
    },
    "retryable": false
  }
}
```

---

### 3. Tool 相關錯誤

#### TOOL_EXECUTION_ERROR
- **HTTP Status**: 500
- **訊息**: Tool 執行失敗
- **可重試**: ❌ No（改由 LLM 處理）
- **觸發情境**:
  - Function 執行時拋出例外
  - MCP tool 回傳錯誤
- **處理方式**: 將錯誤訊息包裝成 `tool.error` 事件，讓 LLM 決定下一步
- **範例**（事件格式）:
```json
{
  "type": "tool.error",
  "call_id": "call_abc123",
  "error": {
    "code": "TOOL_EXECUTION_ERROR",
    "message": "Tool 執行失敗",
    "details": {
      "tool_name": "search_database",
      "error_message": "Database connection failed"
    }
  }
}
```

#### TOOL_APPROVAL_DENIED
> ⚠️ **未實作功能**：此錯誤碼為 Phase 6 規劃的「Tool 批准機制」，目前尚未實作

- **HTTP Status**: 200（正常流程）
- **訊息**: 使用者拒絕執行 tool
- **可重試**: ❌ No
- **觸發情境**: `tool_results` 中 `approved: false`（尚未實作）
- **處理方式**: 發送 `tool.denied` 事件，將拒絕原因傳給 LLM（尚未實作）
- **範例**（事件格式）:
```json
{
  "type": "tool.denied",
  "call_id": "call_abc123",
  "denied_reason": "使用者拒絕執行此操作"
}
```

---

### 4. 系統錯誤

#### INTERNAL_ERROR
- **HTTP Status**: 500
- **訊息**: 系統內部錯誤
- **可重試**: ✅ Yes（但通常無效）
- **觸發情境**:
  - 資料庫連線失敗
  - 未預期的程式錯誤
  - 系統資源不足
- **範例**:
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "系統內部錯誤",
    "details": {
      "error_id": "uuid-123-456"
    },
    "retryable": true
  }
}
```

#### DATABASE_ERROR
> ⚠️ **未實作**：目前尚未實際使用此錯誤碼，資料庫錯誤會以 INTERNAL_ERROR 回報

- **HTTP Status**: 500
- **訊息**: 資料庫操作失敗
- **可重試**: ✅ Yes
- **觸發情境**:
  - 資料庫連線失敗（尚未實作）
  - SQL 執行錯誤（非邏輯錯誤）（尚未實作）
- **範例**:
```json
{
  "error": {
    "code": "DATABASE_ERROR",
    "message": "資料庫操作失敗",
    "details": {
      "operation": "insert_message"
    },
    "retryable": true
  }
}
```

---

## 重試策略

### 可重試的錯誤
- `MODEL_ERROR`
- `MODEL_TIMEOUT`
- `MODEL_RATE_LIMIT`
- `INTERNAL_ERROR`
- `DATABASE_ERROR`

### 重試規則
```typescript
interface RetryConfig {
  max_retries: 3;
  backoff_strategy: 'exponential';
  base_delay_ms: 1000;
  max_delay_ms: 10000;
}

// 重試間隔計算
function getRetryDelay(attemptNumber: number): number {
  // 1st retry: 1s, 2nd: 2s, 3rd: 4s
  return Math.min(
    1000 * Math.pow(2, attemptNumber - 1),
    10000
  );
}
```

### 特殊處理：Rate Limit
當遇到 `MODEL_RATE_LIMIT` 時，優先使用 Provider 建議的等待時間：
```typescript
if (error.code === 'MODEL_RATE_LIMIT' && error.details.retry_after_seconds) {
  await sleep(error.details.retry_after_seconds * 1000);
  return retry();
}
```

---

## 錯誤事件對應

某些錯誤會透過事件流回傳（而非 HTTP 錯誤回應）：

| 錯誤碼 | 對應事件 | 說明 |
|--------|----------|------|
| `TOOL_EXECUTION_ERROR` | `tool.error` | Tool 執行失敗，LLM 可處理 |
| `TOOL_APPROVAL_DENIED` | `tool.denied` | 使用者拒絕批准 ⚠️ **未實作** |
| `MODEL_ERROR` | `conversation.error` | 對話流程中的模型錯誤 |
| `MODEL_TIMEOUT` | `conversation.timeout` | 對話超時 |
| - | `conversation.canceled` | 使用者取消對話（非錯誤） |

---

## TypeScript 型別定義

```typescript
/**
 * 錯誤碼列舉
 */
export enum ErrorCode {
  // 請求參數錯誤
  INVALID_REQUEST = 'INVALID_REQUEST',
  INVALID_EMAIL_FORMAT = 'INVALID_EMAIL_FORMAT', // ⚠️ 未實作
  PRESET_NOT_FOUND = 'PRESET_NOT_FOUND', // ⚠️ 未實作
  THREAD_NOT_FOUND = 'THREAD_NOT_FOUND',
  THREAD_PERMISSION_DENIED = 'THREAD_PERMISSION_DENIED', // ⚠️ 未實作
  INVALID_TOOL_RESULTS = 'INVALID_TOOL_RESULTS', // ⚠️ 未實作 (Phase 6)

  // 模型相關錯誤
  MODEL_ERROR = 'MODEL_ERROR',
  MODEL_TIMEOUT = 'MODEL_TIMEOUT',
  MODEL_RATE_LIMIT = 'MODEL_RATE_LIMIT',
  INVALID_MODEL_CONFIG = 'INVALID_MODEL_CONFIG',

  // Tool 相關錯誤
  TOOL_EXECUTION_ERROR = 'TOOL_EXECUTION_ERROR',
  TOOL_APPROVAL_DENIED = 'TOOL_APPROVAL_DENIED', // ⚠️ 未實作 (Phase 6)

  // 系統錯誤
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR', // ⚠️ 未實作
}

/**
 * 錯誤回應結構
 */
export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, any>;
    retryable: boolean;
  }
}

/**
 * 檢查錯誤是否可重試
 */
export function isRetryableError(code: ErrorCode): boolean {
  return [
    ErrorCode.MODEL_ERROR,
    ErrorCode.MODEL_TIMEOUT,
    ErrorCode.MODEL_RATE_LIMIT,
    ErrorCode.INTERNAL_ERROR,
    ErrorCode.DATABASE_ERROR,
  ].includes(code);
}
```

---

## 使用範例

### 後端拋出錯誤
```typescript
import { ErrorCode, ErrorResponse } from './types';

// Koa 中間件
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    const errorResponse: ErrorResponse = {
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: '系統內部錯誤',
        details: { error: err.message },
        retryable: true
      }
    };
    ctx.status = 500;
    ctx.body = errorResponse;
  }
});

// 業務邏輯中拋出特定錯誤
if (!preset) {
  ctx.throw(404, JSON.stringify({
    error: {
      code: ErrorCode.PRESET_NOT_FOUND,
      message: '找不到指定的 preset',
      details: { name: requestBody.name },
      retryable: false
    }
  }));
}
```

### 前端處理錯誤
```typescript
async function callApi(body: ApiRequestBody) {
  try {
    const response = await fetch('/v4/response', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData: ErrorResponse = await response.json();

      // 檢查是否可重試
      if (errorData.error.retryable) {
        return retryWithBackoff(() => callApi(body));
      }

      // 不可重試，顯示錯誤訊息
      showError(errorData.error.message);
    }

    return response;
  } catch (err) {
    // 網路錯誤等
    console.error('API call failed:', err);
  }
}
```

---

## 未來擴展

當遇到新的錯誤情境時，遵循以下原則新增錯誤碼：

1. **確認必要性**：是否真的需要獨立的錯誤碼？
2. **語意清晰**：錯誤碼名稱要能清楚表達錯誤類型
3. **可操作性**：前端收到錯誤後知道如何處理
4. **文檔完整**：包含範例和觸發情境

**不要新增的錯誤碼**：
- 過於細分的錯誤（如 `THREAD_PROJECT_MISMATCH` vs `THREAD_PERMISSION_DENIED`）
- 前端無法區別處理的錯誤
- 發生機率極低的邊界情況
