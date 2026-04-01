# V4 API Input 格式規格

**版本**：v4.1
**最後更新**：2026-03-31
**設計基準**：OpenAI Response API

---

## 🎯 概述

V4 API 的 `input` 參數採用 **OpenAI Response API** 標準格式，確保：

1. **最大相容性** - 業界廣泛使用的標準格式
2. **功能完整** - 支援純文字、多輪對話、多模態內容
3. **簡單易用** - 前端無需關心後端如何處理

---

## 📋 支援的 Input 格式

### 格式 1：純文字字串

**用途**：最簡單的單輪對話

**範例**：
```json
{
  "name": "gpt-4o-mini",
  "input": "請幫我寫一首關於冬天的詩"
}
```

**適用場景**：
- 簡單查詢
- 單次請求
- 不需要 system prompt 的對話

---

### 格式 2：Messages 陣列

**用途**：明確指定多輪對話內容（包含 system/user/assistant）

**範例**：
```json
{
  "name": "gpt-4o-mini",
  "input": [
    {
      "role": "system",
      "content": "你是一位專業的詩人"
    },
    {
      "role": "user",
      "content": "請幫我寫一首關於冬天的詩"
    }
  ]
}
```

#### Message 結構

```typescript
{
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}
```

#### Role 說明

| Role | 說明 | 範例 |
|------|------|------|
| `system` | 系統指令，設定 AI 行為 | "你是一位專業的詩人" |
| `user` | 使用者訊息 | "請幫我寫詩" |
| `assistant` | AI 回應（用於多輪對話歷史） | "好的，讓我為你創作..." |

**適用場景**：
- 需要 system prompt 的對話
- 多輪對話中明確指定歷史訊息
- 需要精確控制對話流程

---

### 格式 3：多模態內容

**用途**：包含圖片、PDF、音訊等多媒體內容

**範例**：
```json
{
  "name": "gpt-4o",
  "input": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "這張圖片是什麼？"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "https://example.com/image.jpg"
          }
        }
      ]
    }
  ]
}
```

#### ContentPart 類型

```typescript
type ContentPart =
  | TextContentPart
  | ImageContentPart
  | FileContentPart
  | AudioContentPart;
```

#### 文字內容

```typescript
{
  type: "text";
  text: string;
}
```

#### 圖片內容（URL 方式）

```typescript
{
  type: "image_url";
  image_url: {
    url: string;    // 圖片 URL 或 Base64 Data URL
  };
}
```

**url 支援格式**：
- HTTPS URL：`https://example.com/image.jpg`
- Base64 Data URL：`data:image/png;base64,iVBOR...`

#### 檔案內容（圖片 + PDF）

> v4.1 新增

通用檔案上傳，支援圖片和 PDF。以 Base64 方式傳入，所有 Provider 皆支援。

```typescript
{
  type: "file";
  file: {
    filename: string;     // 檔案名稱（含副檔名）
    mime_type: string;    // MIME type
    data: string;         // 純 Base64 編碼資料（不含 data: prefix）
  };
}
```

**支援的 MIME types**：

| MIME type | 說明 |
|-----------|------|
| `image/png` | PNG 圖片 |
| `image/jpeg` | JPEG 圖片 |
| `image/webp` | WebP 圖片 |
| `image/gif` | GIF 圖片 |
| `application/pdf` | PDF 文件 |

**與 `image_url` 的差異**：

| | `image_url` | `file` |
|--|-------------|--------|
| 支援格式 | 圖片 | 圖片 + PDF |
| 傳入方式 | URL 或 Data URL | 純 Base64 |
| 適用場景 | 圖片已有公開 URL | 前端選檔上傳 |

兩種方式皆可使用，`file` 是推薦的新方式，支援更多格式。

#### 音訊內容

> 目前尚未實作，規格保留供未來使用

```typescript
{
  type: "input_audio";
  input_audio: {
    data: string;        // Base64 編碼的音訊資料
    format: "wav" | "mp3";
  };
}
```

**適用場景**：
- 圖片分析（OCR、物件辨識等）
- PDF 文件理解（報表、成績單等）
- 多媒體內容理解

---

## 🎨 完整使用範例

### 範例 1：簡單查詢

```typescript
const response = await fetch('/v4/response', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'gpt-4o-mini',
    input: '台北今天天氣如何？'
  })
});

const result = await response.json();
console.log(result.outputs[0].text);
```

---

### 範例 2：帶 System Prompt 的對話

```typescript
const response = await fetch('/v4/response', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'gpt-4o-mini',
    input: [
      {
        role: 'system',
        content: '你是一位專業的 Python 程式設計師，擅長解釋程式碼'
      },
      {
        role: 'user',
        content: '請解釋什麼是 list comprehension'
      }
    ]
  })
});
```

---

### 範例 3：多輪對話（使用 thread_id）

```typescript
// 第一輪對話
const response1 = await fetch('/v4/response', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'gpt-4o-mini',
    input: '請記住我的名字是小明'
  })
});
const result1 = await response1.json();
const threadId = result1.thread_id;  // 儲存 thread_id

// 第二輪對話（使用同一個 thread）
const response2 = await fetch('/v4/response', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    thread_id: threadId,  // 帶上 thread_id
    input: '我叫什麼名字？'
  })
});
const result2 = await response2.json();
console.log(result2.outputs[0].text);  // "你叫小明"
```

**重要**：
- 使用 `thread_id` 時，系統會自動載入歷史對話
- 不需要在 `input` 中重複提供歷史訊息
- 系統會維護完整的對話脈絡

---

### 範例 4：圖片分析（image_url）

```typescript
const response = await fetch('/v4/response', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'gpt-4o',
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: '這張圖片裡有什麼？請詳細描述'
          },
          {
            type: 'image_url',
            image_url: {
              url: 'https://example.com/photo.jpg'
            }
          }
        ]
      }
    ]
  })
});
```

---

### 範例 5：上傳圖片（file）

前端選檔後，將圖片轉為 Base64 傳入：

```typescript
// 將 File 物件轉為 Base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1]);  // 去掉 data:...;base64, prefix
    };
    reader.readAsDataURL(file);
  });
}

const file = inputElement.files[0];  // 使用者選的檔案
const base64 = await fileToBase64(file);

const response = await fetch('/v4/response', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'gpt-4o',
    input: [
      {
        role: 'user',
        content: [
          { type: 'text', text: '請描述這張圖片' },
          {
            type: 'file',
            file: {
              filename: file.name,
              mime_type: file.type,
              data: base64
            }
          }
        ]
      }
    ]
  })
});
```

---

### 範例 6：上傳 PDF

```typescript
const pdfFile = inputElement.files[0];
const base64 = await fileToBase64(pdfFile);

const response = await fetch('/v4/response', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'gpt-4o',
    input: [
      {
        role: 'user',
        content: [
          { type: 'text', text: '請摘要這份報告的重點' },
          {
            type: 'file',
            file: {
              filename: 'report.pdf',
              mime_type: 'application/pdf',
              data: base64
            }
          }
        ]
      }
    ]
  })
});
```

---

### 範例 7：圖片 + 對話歷史

```typescript
const response = await fetch('/v4/response', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'gpt-4o',
    input: [
      {
        role: 'system',
        content: '你是一位專業的美術評論家'
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: '請分析這幅畫的風格和技法'
          },
          {
            type: 'image_url',
            image_url: {
              url: 'https://example.com/painting.jpg'
            }
          }
        ]
      }
    ]
  })
});
```

---

## 📝 TypeScript 型別定義

```typescript
/**
 * Prompt Input 參數
 */
export type PromptInput = string | Message[];

/**
 * Message 物件
 */
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
  name?: string;  // 可選的名稱（用於 function call）
}

/**
 * Content Part（多模態內容）
 */
export type ContentPart =
  | TextContentPart
  | ImageContentPart
  | FileContentPart
  | AudioContentPart;

export interface TextContentPart {
  type: 'text';
  text: string;
}

export interface ImageContentPart {
  type: 'image_url';
  image_url: {
    url: string;
  };
}

/**
 * 檔案內容（v4.1 新增）
 *
 * 支援圖片（png/jpeg/webp/gif）和 PDF
 */
export interface FileContentPart {
  type: 'file';
  file: {
    filename: string;     // 檔案名稱（含副檔名）
    mime_type: string;    // MIME type
    data: string;         // 純 Base64（不含 data: prefix）
  };
}

export interface AudioContentPart {
  type: 'input_audio';
  input_audio: {
    data: string;  // Base64
    format: 'wav' | 'mp3';
  };
}
```

---

## ✅ 最佳實踐

### 1. 選擇正確的格式

| 使用場景 | 推薦格式 |
|---------|---------|
| 簡單查詢 | 純文字字串 |
| 需要 system prompt | Messages 陣列 |
| 多輪對話 | 使用 `thread_id`，input 用純文字 |
| 圖片分析 | Messages 陣列 + `image_url` 或 `file` |
| PDF 文件理解 | Messages 陣列 + `file`（mime_type: `application/pdf`） |

---

### 2. 多輪對話建議

**✅ 推薦做法**（使用 thread_id）：
```typescript
// 第一輪
const res1 = await callAPI({ input: '記住我叫小明' });
const threadId = res1.thread_id;

// 第二輪（系統自動載入歷史）
const res2 = await callAPI({
  thread_id: threadId,
  input: '我叫什麼？'
});
```

**❌ 不推薦做法**（手動維護歷史）：
```typescript
// 不推薦：手動維護歷史訊息
const history = [];
history.push({ role: 'user', content: '記住我叫小明' });
history.push({ role: 'assistant', content: '好的，記住了' });
history.push({ role: 'user', content: '我叫什麼？' });

const res = await callAPI({ input: history });  // 繁瑣且容易出錯
```

---

### 3. 圖片與檔案處理建議

- **推薦使用 `file` 類型**：支援圖片和 PDF，格式統一
- **`image_url` 仍可使用**：適合圖片已有公開 URL 的情境
- **檢查模型支援**：確保使用支援多模態的模型（如 `gpt-4o`）
- **注意檔案大小**：Base64 編碼會使檔案大小增加約 33%，建議控制在合理範圍內

---

### 4. System Prompt 建議

**✅ 好的 system prompt**：
```typescript
{
  role: 'system',
  content: '你是一位專業的 Python 程式設計師。請用簡單易懂的方式解釋程式概念，並提供實際範例'
}
```

**❌ 不好的 system prompt**：
```typescript
{
  role: 'system',
  content: '你是 AI'  // 太簡短，沒有明確指引
}
```

---

## ⚠️ 常見錯誤

### 錯誤 1：混淆 input 格式

```typescript
// ❌ 錯誤：純文字不應包在陣列中
{
  input: [{
    content: '你好'  // 缺少 role 欄位
  }]
}

// ✅ 正確：純文字直接提供
{
  input: '你好'
}

// ✅ 正確：Messages 陣列格式
{
  input: [{
    role: 'user',
    content: '你好'
  }]
}
```

---

### 錯誤 2：多輪對話時重複提供完整歷史

```typescript
// ❌ 不推薦：每次都帶完整歷史
{
  thread_id: 123,
  input: [
    { role: 'user', content: '第一句' },
    { role: 'assistant', content: '回答' },
    { role: 'user', content: '第二句' },
    { role: 'assistant', content: '回答' },
    { role: 'user', content: '第三句' }  // 當前輸入
  ]
}

// ✅ 正確：使用 thread_id，只提供當前輸入
{
  thread_id: 123,
  input: '第三句'  // 系統自動載入歷史
}
```

---

### 錯誤 3：圖片 URL 格式錯誤

```typescript
// ❌ 錯誤：缺少完整結構
{
  input: [{
    role: 'user',
    content: [
      { type: 'image_url', url: 'https://...' }  // 缺少 image_url 巢狀
    ]
  }]
}

// ✅ 正確：完整的 image_url 結構
{
  input: [{
    role: 'user',
    content: [
      {
        type: 'image_url',
        image_url: { url: 'https://...' }  // 正確的巢狀結構
      }
    ]
  }]
}
```

---

## 🔗 相關文件

- [Request 參數規格](./request.md) - 完整的請求參數說明
- [Response 格式規格](./response.md) - 回應格式詳解
- [Events 事件規格](./events.md) - SSE 串流事件

---

**最後更新**：2026-03-31
**維護者**：前端開發者如有問題，請參考範例或聯繫後端團隊
