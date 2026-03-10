# Context 模板語法指南

本文件說明如何使用 `context` 參數搭配模板語法，動態替換 AI 助理的 prompt 內容。

---

## 概述

Context 模板讓你可以在呼叫 API 時，動態注入變數到 AI 助理的 `instructions`（系統提示詞）中。這非常適合：

- 個人化對話情境（如用戶名稱、學校名稱）
- 多租戶場景（如不同客戶有不同的設定）
- 動態調整 AI 行為

---

## 基本語法

### 模板標籤

使用 ASP 風格的標籤語法：

```
<%= ctx.變數名稱 %>
```

- `<%=` 和 `%>` 是標籤的開始和結束
- `ctx` 是固定前綴，所有變數都必須從 `ctx` 開始存取
- 變數名稱支援巢狀物件存取（如 `ctx.user.name`）

### 範例

**Preset 中的 instructions：**
```
你是 <%= ctx.school %> 的 AI 助理，專門協助 <%= ctx.user_name %> 解答問題。
請使用 <%= ctx.language %> 回答。
```

**API 請求：**
```json
{
  "name": "my-assistant",
  "input": "請問今天天氣如何？",
  "context": {
    "school": "台灣大學",
    "user_name": "王小明",
    "language": "繁體中文"
  }
}
```

**實際發送給模型的 instructions：**
```
你是台灣大學的 AI 助理，專門協助王小明解答問題。
請使用繁體中文回答。
```

---

## 支援的替換位置

Context 模板會自動替換以下位置的變數：

| 位置 | 說明 |
|------|------|
| `instructions` | Preset 設定中的系統提示詞 |

### 範例：替換 input 中的 system 訊息

```json
{
  "name": "my-assistant",
  "input": [
    {
      "role": "system",
      "content": "你現在扮演 <%= ctx.character_name %>，請用 <%= ctx.tone %> 的語氣說話。"
    },
    {
      "role": "user",
      "content": "你好！"
    }
  ],
  "context": {
    "character_name": "哆啦A夢",
    "tone": "可愛"
  }
}
```

---

## 變數類型支援

### 基本類型

```json
{
  "context": {
    "name": "小明",           // 字串
    "age": 18,                // 數字
    "is_vip": true            // 布林值
  }
}
```

**模板使用：**
```
用戶 <%= ctx.name %>，年齡 <%= ctx.age %>，VIP 狀態：<%= ctx.is_vip %>
```

### 巢狀物件

```json
{
  "context": {
    "user": {
      "name": "王小明",
      "email": "xiaoming@example.com",
      "profile": {
        "department": "資訊工程系",
        "grade": 3
      }
    }
  }
}
```

**模板使用：**
```
學生 <%= ctx.user.name %>（<%= ctx.user.profile.department %> <%= ctx.user.profile.grade %> 年級）
```

### 陣列

```json
{
  "context": {
    "skills": ["Python", "JavaScript", "SQL"]
  }
}
```

**直接輸出（會轉為逗號分隔字串）：**
```
技能：<%= ctx.skills %>
```
輸出：`技能：Python,JavaScript,SQL`

> **提示**：如需更複雜的陣列格式，請參考下方「進階語法」章節的迴圈用法。

---

## 進階語法

除了基本的變數替換，模板引擎還支援條件判斷和迴圈等控制語法，讓你能建立更動態的 prompt。

### 語法總覽

| 語法 | 用途 | 說明 |
|------|------|------|
| `<%= %>` | 輸出 | 輸出變數值或表達式結果 |
| `<% %>` | 執行 | 執行 JavaScript 程式碼（不輸出） |

### 條件判斷 (if / else if / else)

根據條件動態顯示不同內容：

**模板：**
```
你好 <%= ctx.user.name %>！
<% if (ctx.user.role === "teacher") { %>
您是老師，教授科目：<%= ctx.user.subject %>
<% } else if (ctx.user.role === "student") { %>
您是學生，年級：<%= ctx.user.grade %>
<% } else { %>
歡迎訪客！
<% } %>
```

**Context 資料：**
```json
{
  "context": {
    "user": {
      "name": "王老師",
      "role": "teacher",
      "subject": "數學"
    }
  }
}
```

**輸出結果：**
```
你好 王老師！
您是老師，教授科目：數學
```

### for...of 迴圈

遍歷陣列中的每個元素：

**模板：**
```
課程列表：
<% for (let course of ctx.courses) { %>
- <%= course.name %>（<%= course.credits %> 學分）- 教師：<%= course.teacher %>
<% } %>
```

**Context 資料：**
```json
{
  "context": {
    "courses": [
      { "name": "數學", "credits": 3, "teacher": "王老師" },
      { "name": "英文", "credits": 2, "teacher": "李老師" },
      { "name": "程式設計", "credits": 4, "teacher": "陳老師" }
    ]
  }
}
```

**輸出結果：**
```
課程列表：
- 數學（3 學分）- 教師：王老師
- 英文（2 學分）- 教師：李老師
- 程式設計（4 學分）- 教師：陳老師
```

### for 迴圈（索引存取）

當你需要索引值時，使用傳統 for 迴圈：

**模板：**
```
成績統計：
<% for (let i = 0; i < ctx.scores.length; i++) { %>
第 <%= i + 1 %> 次考試：<%= ctx.scores[i] %> 分
<% } %>
平均分數：<%= ctx.average %>
```

**Context 資料：**
```json
{
  "context": {
    "scores": [85, 92, 78, 88, 95],
    "average": 87.6
  }
}
```

**輸出結果：**
```
成績統計：
第 1 次考試：85 分
第 2 次考試：92 分
第 3 次考試：78 分
第 4 次考試：88 分
第 5 次考試：95 分
平均分數：87.6
```

### 巢狀結構（迴圈 + 條件）

結合迴圈和條件判斷處理複雜資料：

**模板：**
```
班級名單：
<% for (let student of ctx.students) { %>
學號：<%= student.id %> 姓名：<%= student.name %>
<% if (student.scores && student.scores.length > 0) { %>
  成績：
  <% for (let i = 0; i < student.scores.length; i++) { %>
    <% if (student.scores[i] >= 90) { %>
  第 <%= i + 1 %> 次：<%= student.scores[i] %> 分（優秀）
    <% } else if (student.scores[i] >= 70) { %>
  第 <%= i + 1 %> 次：<%= student.scores[i] %> 分（良好）
    <% } else { %>
  第 <%= i + 1 %> 次：<%= student.scores[i] %> 分（需加強）
    <% } %>
  <% } %>
<% } else { %>
  尚無成績記錄
<% } %>

<% } %>
```

**Context 資料：**
```json
{
  "context": {
    "students": [
      { "id": "S001", "name": "張小明", "scores": [85, 92, 78] },
      { "id": "S002", "name": "李小華", "scores": [95, 88, 91] },
      { "id": "S003", "name": "王小美", "scores": [] }
    ]
  }
}
```

### 陣列方法

可以在輸出標籤中使用 JavaScript 陣列方法：

**模板：**
```
技能：<%= ctx.skills.join('、') %>
總分：<%= ctx.scores.reduce((a, b) => a + b, 0) %>
平均：<%= (ctx.scores.reduce((a, b) => a + b, 0) / ctx.scores.length).toFixed(1) %>
```

**Context 資料：**
```json
{
  "context": {
    "skills": ["Python", "JavaScript", "SQL"],
    "scores": [85, 92, 78]
  }
}
```

**輸出結果：**
```
技能：Python、JavaScript、SQL
總分：255
平均：85.0
```

### 進階語法注意事項

1. **區塊必須閉合**：每個 `<% if (...) { %>` 都必須有對應的 `<% } %>`
2. **變數作用域**：在 `<% %>` 中宣告的變數（如 `let i`）只在該區塊內有效
3. **空白控制**：控制語法會產生換行，可透過調整模板排版來控制輸出格式
4. **效能考量**：過於複雜的巢狀結構可能影響渲染效能，建議保持邏輯簡潔
5. **安全限制**：進階語法同樣受到安全機制保護，禁止存取 `constructor`、`__proto__` 等危險屬性

---

## 空值處理

當變數不存在或為 `null`/`undefined` 時，會輸出空字串：

```json
{
  "context": {
    "name": "小明"
    // 沒有 title 欄位
  }
}
```

**模板：**
```
<%= ctx.title %> <%= ctx.name %> 你好
```

**輸出：**
```
 小明 你好
```

> **建議**：確保所有模板中使用的變數都有提供值，或在 instructions 設計時考慮空值情況。

---

## 完整 API 範例

### 基本使用

```bash
curl -X POST https://api.example.com/v4/response \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "customer-service",
    "input": "我想查詢我的訂單",
    "context": {
      "customer_name": "張小華",
      "customer_id": "C12345",
      "vip_level": "黃金會員"
    }
  }'
```

### 搭配多輪對話

```bash
curl -X POST https://api.example.com/v4/response \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "tutor-assistant",
    "thread_id": 12345,
    "input": "請幫我解釋這個公式",
    "context": {
      "student_name": "李同學",
      "subject": "數學",
      "grade_level": "高中二年級",
      "learning_style": "視覺型學習者"
    }
  }'
```

### 搭配 SSE 串流

```bash
curl -X POST https://api.example.com/v4/response \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "writing-assistant",
    "input": "幫我寫一封感謝信",
    "stream": true,
    "context": {
      "recipient": "王老師",
      "occasion": "畢業典禮",
      "tone": "正式但溫馨"
    }
  }'
```

---

## 安全機制

為了防止模板注入攻擊，系統內建多層安全保護：

### 禁止的語法

以下語法會被安全機制阻擋：

```
<%= ctx.constructor %>           ❌ 禁止存取 constructor
<%= ctx.__proto__ %>             ❌ 禁止存取原型鏈
<%= ctx.user.constructor %>      ❌ 禁止巢狀 constructor 存取
<%= eval('code') %>              ❌ 禁止 eval
<%= require('fs') %>             ❌ 禁止 require
```

### 安全的變數命名

變數名稱建議使用：
- 英文字母、數字、底線
- 小寫字母開頭
- 避免特殊字符

```json
{
  "context": {
    "user_name": "小明",       ✅ 推薦
    "userName": "小明",        ✅ 可以
    "user-name": "小明",       ⚠️ 需用 ctx['user-name'] 存取
    "123name": "小明"          ❌ 不建議
  }
}
```

---

## 常見問題

### Q: 模板沒有被替換？

**可能原因：**
1. 語法錯誤：確認使用 `<%= ctx.變數 %>`，注意 `ctx` 前綴
2. 變數名稱不匹配：檢查 context 中的 key 是否正確
3. 多餘空格：`<%=ctx.name%>` 和 `<%= ctx.name %>` 都可以，但要確保標籤完整

### Q: 可以在模板中使用邏輯判斷嗎？

可以！請參考「進階語法」章節，支援 if/else 條件判斷和 for 迴圈等控制語法。

### Q: 變數值包含特殊字符怎麼辦？

變數值會自動進行安全過濾，一般情況下可以直接使用：

```json
{
  "context": {
    "message": "Hello <World> & \"Friends\""
  }
}
```

輸出會保持原樣。

### Q: context 有大小限制嗎？

建議將 context 物件控制在合理範圍內（< 10KB）。過大的 context 可能影響效能。

---

## 相關文件

- [V4 Response API 參數規格](./request.md)
- [API 快速開始](./README.md)
- [錯誤代碼說明](./error-codes.md)
