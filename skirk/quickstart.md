# Skirk 快速入門

Skirk 是 1Campus GPT 的 AI 助理前端框架，讓你不用寫前端就能部署一個完整的聊天介面。

---

## 什麼是 Skirk？

Skirk 把 V4 API 包裝成一個可直接使用的聊天介面，提供：

- 完整的聊天 UI（SSE 串流、Markdown 渲染、程式碼高亮）
- 多種認證模式（匿名、1Campus 身份驗證、外部系統整合）
- 對話記錄管理（建立、載入、刪除）
- Gadget 小工具整合（校務系統操作）
- LINE Bot 整合

你只需要在管理介面建立一個 Skirk App，設定好 Preset 和認證方式，就能拿到一個入口 URL 給使用者。

---

## 建立第一個 Skirk App

### 前置需求

- 一個已建立的 Preset（AI 助理配置）
- 一組 API Key

### Step 1：進入管理介面

在專案頁面選擇 **Skirk** 標籤，點擊「新增助理」。

### Step 2：填寫基本資訊

| 欄位 | 說明 | 範例 |
|------|------|------|
| 顯示名稱 | 使用者看到的助理名稱 | `校園小幫手` |
| 助理識別碼 | URL 中的代碼（不可重複） | `school-helper` |
| Preset | 選擇 AI 助理配置 | `tutor-assistant` |
| API Key | 選擇授權金鑰 | `prj_xxx.key_yyy` |

建立後預設為 **anonymous**（匿名）模式。

### Step 3：取得入口 URL

建立完成後，自動導航到設定頁。在「入口連結」區塊複製連結：

```
https://gpt.1campus.net/skirk/?assistant=school-helper
```

將此連結分享給使用者，就能開始對話了。

### Step 4：調整認證模式（選用）

如果需要身份驗證，在設定頁的「認證設定」區塊選擇合適的 auth mode。

詳見 [認證模式指南](./auth-modes.md)。

---

## Skirk 與 V4 API 的關係

Skirk 是 V4 API 的一層包裝，底層仍是 V4 API 驅動：

```
使用者 → Skirk 聊天介面 → Skirk 後端 → V4 API
```

Skirk 後端負責：
1. **認證**：根據 auth mode 驗證使用者身份
2. **Session 管理**：維護使用者的登入狀態
3. **V4 請求組裝**：將 session 資訊轉換為 V4 的 `user`、`context`、`credential`
4. **對話記錄**：儲存聊天歷史（AI 記憶由 V4 thread 負責）

Skirk 上設定的 Preset、API Key、認證資訊，最終都會轉換成 V4 API 的請求參數。V4 API 的所有功能（Function Call、Context 模板、多模態輸入等）在 Skirk 中都可使用。
