# V4 Title Generation API

## 📋 概述

Title Generation API 提供對話標題自動生成功能，可以根據對話訊息內容智慧產生簡潔、準確的繁體中文標題。

**API 版本**: V4
**認證方式**: API Key（與 `/v4/response` 相同）
**模型**: gpt-4.1-nano

## 🔄 API 規格

### 生成標題

**POST** `/v4/title-generation`

根據提供的對話訊息內容，使用 AI 自動生成適合的繁體中文標題。

#### 請求頭

```
Authorization: Bearer <api_key>
Content-Type: application/json
```

#### 請求格式

```typescript
interface TitleGenerationRequest {
  messages: ChatMessage[];
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
```

#### 請求範例

```bash
curl -X POST https://api.gpt.1campus.net/v4/title-generation \
  -H "Authorization: Bearer sk-1234567890abcdef" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "我想了解如何在 Angular 中使用 Signals"
      },
      {
        "role": "assistant",
        "content": "Angular Signals 是 Angular 16 中引入的響應式狀態管理功能，提供了一種新的方式來管理應用程式狀態。以下是基本用法..."
      },
      {
        "role": "user",
        "content": "可以給我一個實際的範例嗎？"
      },
      {
        "role": "assistant",
        "content": "當然！這裡是一個簡單的 Angular Signals 範例..."
      }
    ]
  }'
```

#### 成功回應

**狀態碼：200**

```typescript
interface TitleGenerationResponse {
  title: string;              // 生成的標題（5-15字）
  originalTitle?: string;      // 原始標題（如有截取時提供）
  totalCharCount: number;      // 分析的總字數
  messageCount: number;        // 訊息數量
}
```

範例：
```json
{
  "title": "Angular Signals 響應式狀態管理教學",
  "totalCharCount": 156,
  "messageCount": 4
}
```

當標題超過 50 字時會自動截取：
```json
{
  "title": "Angular Signals 響應式狀態管理...",
  "originalTitle": "Angular Signals 響應式狀態管理完整教學與實戰範例詳解",
  "totalCharCount": 156,
  "messageCount": 4
}
```

#### 錯誤回應

**400 - 請求格式錯誤**

```json
{
  "error": "請提供要分析的對話訊息",
  "code": "INVALID_MESSAGES"
}
```

**400 - 訊息格式錯誤**

```json
{
  "error": "訊息格式錯誤，需要包含 role 和 content 欄位",
  "code": "INVALID_MESSAGE_FORMAT"
}
```

**400 - 角色值錯誤**

```json
{
  "error": "role 必須是 user、assistant 或 system",
  "code": "INVALID_ROLE"
}
```

**400 - 內容太短**

```json
{
  "error": "對話內容太短，無法產生有意義的標題",
  "code": "CONTENT_TOO_SHORT",
  "totalCharCount": 8
}
```

**401 - 未授權**

```json
{
  "error": "Unauthorized"
}
```

**429 - API 頻率限制**

```json
{
  "error": "AI API 請求頻率限制",
  "code": "API_RATE_LIMIT"
}
```

**500 - AI API 驗證失敗**

```json
{
  "error": "AI API 驗證失敗",
  "code": "API_AUTH_ERROR"
}
```

**502 - AI 服務不可用**

```json
{
  "error": "AI 服務暫時不可用",
  "code": "API_SERVICE_ERROR"
}
```

## 🔒 安全與驗證

- **API Key 驗證**：必須提供有效的 API Key（與 `/v4/response` 相同）
- **支援格式**：
  - 標準格式：`Authorization: Bearer <api_key>`
  - 專案格式：`Authorization: Bearer <project_code>.<api_key>`
  - Debug Token：`X-Debug-Token: <jwt_token>`（管理介面 Debug 模式）

## 📝 使用說明

### 標題生成規則

1. **長度**：5-15個繁體中文字（最長 50 字，超過會截取）
2. **語言**：繁體中文為主，專業術語可保留英文
3. **風格**：簡潔、清楚，準確概括對話內容
4. **內容要求**：避免過於籠統的詞彙，重點突出核心主題

### 最佳實踐

1. **訊息選擇**：建議傳入對話的前 2-6 個訊息，包含完整的問答互動
2. **字數控制**：總訊息內容建議超過 10 字（user + assistant），以獲得更好的標題品質
3. **訊息品質**：確保傳入的訊息內容有意義，避免過短或無關內容

### TypeScript 整合範例

```typescript
interface TitleGenerationRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
}

interface TitleGenerationResponse {
  title: string;
  originalTitle?: string;
  totalCharCount: number;
  messageCount: number;
}

async function generateTitle(
  messages: TitleGenerationRequest['messages'],
  apiKey: string
): Promise<string> {
  const response = await fetch('https://api.gpt.1campus.net/v4/title-generation', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ messages })
  });

  if (!response.ok) {
    throw new Error(`Title generation failed: ${response.status}`);
  }

  const data: TitleGenerationResponse = await response.json();
  return data.title;
}

// 使用範例
const title = await generateTitle([
  { role: 'user', content: '如何使用 Angular Signals？' },
  { role: 'assistant', content: 'Angular Signals 是...' }
], 'your-api-key');

console.log('生成的標題:', title);
```

### 前端整合範例

在聊天介面中自動生成標題：

```typescript
// 檢查是否需要生成標題
const shouldGenerateTitle = (
  messages: ChatMessage[],
  currentTitle: string
): boolean => {
  const totalCharCount = messages
    .filter(msg => ['user', 'assistant'].includes(msg.role))
    .reduce((sum, msg) => sum + msg.content.length, 0);

  return totalCharCount >= 10 && currentTitle === '新對話';
};

// 生成並更新標題
async function autoGenerateTitle(
  sessionId: string,
  messages: ChatMessage[],
  apiKey: string
) {
  if (!shouldGenerateTitle(messages, session.title)) {
    return;
  }

  try {
    const title = await generateTitle(
      messages.slice(0, 6), // 只取前 6 個訊息
      apiKey
    );

    // 更新 session 標題
    await updateSessionTitle(sessionId, title);
  } catch (error) {
    console.error('自動生成標題失敗:', error);
    // 靜默失敗，不影響主要功能
  }
}
```

## 🎯 與 V3 的差異

| 項目 | V3 | V4 |
|------|----|----|
| **API Key 驗證** | ❌ 無（註解掉） | ✅ 必須提供 |
| **使用模型** | gpt-5-mini | gpt-4.1-nano |
| **API 端點** | `/v3/title-generation` | `/v4/title-generation` |
| **參數格式** | 相同 | 相同 |
| **回應格式** | 相同 | 相同 |

## 🔗 相關 API

- [V4 Response API](./response.md) - V4 回應處理 API
- [V4 Prepare API](./prepare.md) - V4 準備 API

---

**版本**：v1.0
**更新時間**：2025-11-30
