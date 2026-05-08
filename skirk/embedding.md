# Skirk 嵌入指南

將 Skirk AI 助理嵌入到你的網站或應用程式中。

---

## 入口 URL 格式

每種認證模式有不同的入口 URL：

| Auth Mode | 入口 URL |
|-----------|---------|
| `anonymous` | `https://gpt.1campus.net/skirk/?assistant={code}` |
| `identity_code` | `/api/skirk/auth/login?assistant={code}&dsns={dsns}&code={identity_code}` ※[註1] |
| `passthrough` | `/api/skirk/auth/passthrough?assistant={code}&{params}` |
| `code_exchange` | `/api/skirk/auth/code-exchange?assistant={code}&code={one_time_code}` |

所有認證模式的入口都會在驗證完成後 **302 重導向**到聊天頁面：

```
/skirk/a/{assistant_code}?sid={session_id}
```

> **[註1] identity_code / identity_code_elevated 模式**：若 App 設定了 `requiredTeacherTags`，老師標籤不符會 redirect 到 `/skirk/?error=您沒有此助理的存取授權`，不會進到聊天頁。詳見 [auth-modes.md 教師標籤校驗](./auth-modes.md#教師標籤校驗requiredteachertags)。

---

## 嵌入方式

### 1. 直接連結

最簡單的方式，直接把入口 URL 作為超連結：

```html
<a href="https://gpt.1campus.net/skirk/?assistant=school-helper" target="_blank">
  開啟 AI 助理
</a>
```

### 2. iframe 嵌入

將聊天介面嵌入到你的頁面中：

```html
<iframe
  src="https://gpt.1campus.net/skirk/?assistant=school-helper"
  width="400"
  height="600"
  style="border: none; border-radius: 12px;"
></iframe>
```

> **注意**：使用 `passthrough` 或 `code_exchange` 模式時，iframe src 應指向對應的認證入口 URL，認證完成後會自動重導向到聊天頁面。

### 3. 新視窗開啟

適合行動裝置或需要全螢幕體驗的場景：

```javascript
function openAssistant() {
  window.open(
    'https://gpt.1campus.net/skirk/?assistant=school-helper',
    'skirk-chat',
    'width=420,height=700'
  );
}
```

---

## Session 機制

- Session 以 `sid`（格式：`skirk_{random36}`）識別
- **有效期**：48 小時，每次存取自動延長
- **前端持久化**：存在 localStorage（key: `skirk_sid_{assistantCode}`）
- 使用者重新開啟同一個助理時，如果 session 未過期，會自動恢復登入狀態

---

## UI 行為差異

不同認證模式下，聊天介面的行為有所不同：

| 功能 | identity_code / elevated | anonymous | passthrough / code_exchange |
|------|:-----------------------:|:---------:|:-------------------------:|
| 對話記錄保留 | 有 | 無 | 依 user 欄位決定 |
| 側邊欄（歷史列表） | 顯示 | 隱藏 | 顯示 |
| 速率限制 | 無 | 有（漸進式） | 無 |

---

## LINE Bot 整合

每個 Skirk App 可以關聯一或多個 LINE Bot 管道，讓使用者透過 LINE 與 AI 助理對話。

### 設定步驟

1. 在 Skirk App 設定頁下方，點擊「新增管道」
2. 輸入 LINE Channel Secret 和 Channel Access Token
3. 系統產生 Webhook URL：`https://gpt.1campus.net/webhook/line/{slug}`
4. 在 LINE Developers 後台填入該 Webhook URL

LINE Bot 的對話同樣透過 V4 API 驅動，共享相同的 Preset 設定。
