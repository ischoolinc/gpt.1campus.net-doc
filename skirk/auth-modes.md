# Skirk 認證模式

每個 Skirk App 在建立時選擇一種認證模式（auth mode），決定使用者如何進入 AI 助理、以及傳遞什麼身份資訊給 V4 API。

---

## Auth Mode 總覽

| Mode | 說明 | 適用場景 |
|------|------|---------|
| `anonymous` | 無需登入，有速率限制 | 公開展示、試用 |
| `identity_code` | 1Campus 平台身份驗證 | 校園內部使用 |
| `passthrough` | URL 參數直接透傳為 credential | 外部系統已有認證機制 |
| `code_exchange` | 外部系統透過一次性 code 橋接身份 | 安全的跨系統整合 |
| `identity_code_elevated` | identity_code + 特權升級 | 需操作校務系統（需特殊申請） |

> **`identity_code_elevated`** 無法從管理介面設定，需透過特殊申請流程開通。

---

## Anonymous

最簡單的模式，不需任何身份資訊。

**入口 URL**：
```
https://gpt.1campus.net/skirk/?assistant={assistant_code}
```

**認證流程**：
```
使用者開啟連結
  → 前端重導向到 /api/skirk/auth/anonymous?assistant=xxx
  → 建立匿名帳號（anonymous_{random}）
  → 建立 session
  → 302 → /skirk/a/{assistant}?sid={sid}
```

**V4 API 對應**：

| V4 欄位 | 值 |
|---------|-----|
| `user` | `"anonymous_user@skirk"` |
| `context` | —（無） |
| `credential` | —（無） |

**限制**：
- 不保留對話記錄（每次都是新對話）
- 有漸進式速率限制（訊息數越多，等待越久）

| 累積訊息數 | 等待時間 |
|-----------|---------|
| 0–35 | 0 秒 |
| 36–60 | 10 秒 |
| 61–100 | 30 秒 |
| 101+ | 60 秒 |

---

## Identity Code

透過 1Campus 平台的 identity code 驗證使用者身份。通常由 1Campus App 帶參數進入。

**入口 URL**：
```
/api/skirk/auth/login?assistant={code}&dsns={dsns}&code={identity_code}
```

**認證流程**：
```
1Campus 平台帶 dsns + identity code 進入
  → 呼叫 devapi.1campus.net/{dsns}/identity/{code} 取得使用者資訊
  → 檢查教師角色
  → 建立 session
  → 302 → /skirk/a/{assistant}?sid={sid}
```

**V4 API 對應**：

| V4 欄位 | 值 |
|---------|-----|
| `user` | 1Campus 帳號（如 `teacher@school.edu.tw`） |
| `context` | identityInfo 展開 + `dsns` + `role` |
| `credential` | —（無） |

**context 結構範例**：
```json
{
  "account": "teacher@school.edu.tw",
  "roleType": "teacher",
  "schoolName": "測試國中",
  "teacher": { "teacherName": "王老師" },
  "dsns": "sh.jh.edu.tw",
  "role": "teacher"
}
```

這些值可以在 Preset 的 instructions 中用模板語法引用：`<%= ctx.schoolName %>`、`<%= ctx.role %>`。

---

## Passthrough

所有 URL query string（除 `assistant` 外）直接透傳為 V4 API 的 `credential`。適合外部系統已有自己的認證機制。

**入口 URL**：
```
/api/skirk/auth/passthrough?assistant={code}&{key1}={value1}&{key2}={value2}&...
```

**認證流程**：
```
外部系統帶參數進入
  → 收集所有 query string（排除 assistant）作為 credential
  → 建立 session
  → 302 → /skirk/a/{assistant}?sid={sid}
```

**V4 API 對應**：

| V4 欄位 | 值 |
|---------|-----|
| `user` | — |
| `context` | — |
| `credential` | 所有 query string 參數 |

**範例**：
```
/api/skirk/auth/passthrough?assistant=skirk_abc&uid=teacher01&jwt=eyJ...&school=台北國中
```

V4 Function Call 會收到：
```json
{
  "credential": {
    "uid": "teacher01",
    "jwt": "eyJ...",
    "school": "台北國中"
  }
}
```

---

## Code Exchange

外部系統透過一次性 code 安全地將身份帶入 Skirk。比 passthrough 更安全，因為敏感資訊不會出現在 URL 中。

**入口 URL**：
```
/api/skirk/auth/code-exchange?assistant={code}&code={one_time_code}
```

**認證流程**：
```
外部系統產生 code
  → 使用者帶 code 進入 Skirk
  → Skirk 從 app config 取得 verify_url 和 verify_method
  → 依 verify_method 呼叫 verify_url：
      GET:  verify_url 中的 {{code}} 替換為實際 code
      POST: 對 verify_url 發送 POST { code }
  → 解析回傳 { user?, context?, credential? }
  → 建立 session
  → 302 → /skirk/a/{assistant}?sid={sid}
```

**V4 API 對應**：

| V4 欄位 | 值 |
|---------|-----|
| `user` | verify 回傳的 `user`（如有） |
| `context` | verify 回傳的 `context`（如有） |
| `credential` | verify 回傳的 `credential`（如有） |

三個欄位都是 optional，與 V4 API 的 `user` / `context` / `credential` 語意完全一致。

### App Config 設定

在管理介面的「認證設定」中填寫：

```json
{
  "verify_url": "https://example.com/api/verify",
  "verify_method": "POST"
}
```

或搭配模板變數（GET 模式）：

```json
{
  "verify_url": "https://1campus.net/q/{{code}}",
  "verify_method": "GET"
}
```

### Verify URL 回傳格式

```json
{
  "user": "teacher_huang",
  "context": { "role": "teacher", "name": "黃家達" },
  "credential": { "token": "abc123" }
}
```

### 搭配 1Campus Short-Service

short-service 可作為簡易的 code 產生與交換機制：

```bash
# 1. 外部系統存入身份資料，取得 code
curl -X POST 'https://1campus.net/q/create' -H 'Content-Type: application/json' -d '{"user":"huang_jd","context":{"role":"teacher","name":"黃家達"}}'

# 回傳：{"code":"y60z6Ea3bgFn"}

# 2. 組出 Skirk 入口 URL
# https://gpt.1campus.net/api/skirk/auth/code-exchange?assistant=skirk_xxx&code=y60z6Ea3bgFn

# 3. Skirk 自動用 GET https://1campus.net/q/y60z6Ea3bgFn 取回身份資料
```

### 安全機制

- Verify URL 有 **10 秒 timeout**
- Response body 限制 **64KB**
- Code 的一次性保護由 verify URL 端自行處理（Skirk 不管 replay）

---

## Identity Code Elevated

在 identity_code 基礎上，透過 signInReg 特權升級取得 `access_token` 和 `dsa_token`，擁有完整的平台操作能力（開 Gadget、查 DSA 校務資料等）。

> **此模式需特殊申請**，無法從管理介面設定。

**入口 URL**：同 identity_code。

**V4 API 對應**：

| V4 欄位 | 值 |
|---------|-----|
| `user` | 1Campus 帳號 |
| `context` | identityInfo + `dsns` + `role` + `schoolCode` + `schoolType` |
| `credential` | `accessToken` + `dsaToken` + `dsns` |

**credential 結構**：
```json
{
  "accessToken": "eyJhbGciOiJIUzI1...",
  "dsaToken": "dsa_token_value",
  "dsns": "sh.jh.edu.tw"
}
```

Token 由 Skirk 後端自動 refresh，前端無感知。
