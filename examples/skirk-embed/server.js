// Skirk Code Exchange 範例後端
//
// 用途：
// 1. 模擬第三方系統的「登入」流程
// 2. 把使用者身份送到 1campus.net short-service 換 code
// 3. 把 code 吐給前端，前端組 Skirk 入口 URL 後塞 iframe
//
// 為什麼要走後端：
//   - 真實環境的 user / accessToken 等敏感資訊不應該在前端組裝
//   - 後端才能驗證使用者身份後再產 code
//
// 啟動：
//   node server.js
//
// 依賴：express

const express = require("express");

const PORT = process.env.PORT || 3002;
const SHORT_SERVICE = "https://1campus.net/q/create";
const SKIRK_ASSISTANT = process.env.SKIRK_ASSISTANT || "skirk_gdeuboao";
const SKIRK_BASE = process.env.SKIRK_BASE || "https://gpt.1campus.net";

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// 模擬「使用者資料庫」：實務上這裡會從 session / DB 取得目前登入使用者
const FAKE_USERS = {
  "student_001": {
    user: "student_001@demo.school",
    context: { name: "王小明", role: "student", grade: 5, className: "501" },
    credential: { accessToken: "sk-score-7f3a9c2e1b7d40568faec3119d2b6e84" },
  },
  "student_002": {
    user: "student_002@demo.school",
    context: { name: "陳美玲", role: "student", grade: 6, className: "603" },
    credential: { accessToken: "sk-score-7f3a9c2e1b7d40568faec3119d2b6e84" },
  },
  "teacher_001": {
    user: "teacher_001@demo.school",
    context: { name: "黃老師", role: "teacher", subject: "數學" },
    credential: { accessToken: "sk-score-7f3a9c2e1b7d40568faec3119d2b6e84" },
  },
};

// POST /api/enter-skirk
//   前端送：{ userId }
//   後端回：{ skirk_url }
//
// 流程：
//   1. 從假使用者資料庫拿身份
//   2. POST 1campus.net/q/create 拿 code
//   3. 組 Skirk 入口 URL 回傳給前端
app.post("/api/enter-skirk", async (req, res) => {
  const { userId } = req.body;
  const identity = FAKE_USERS[userId];

  if (!identity) {
    return res.status(404).json({ error: "使用者不存在" });
  }

  try {
    const createRes = await fetch(SHORT_SERVICE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(identity),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`short-service 失敗：${createRes.status} ${errText}`);
    }

    const { code } = await createRes.json();

    // 注意：code_exchange 模式要打專門入口 /api/skirk/auth/code-exchange
    // 用 /skirk/?... 會被導向 anonymous（預設入口）
    const skirkUrl = `${SKIRK_BASE}/api/skirk/auth/code-exchange?assistant=${SKIRK_ASSISTANT}&code=${code}`;
    res.json({ skirk_url: skirkUrl, user: identity.user });
  } catch (err) {
    console.error("✗ short-service error", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✓ Server: http://localhost:${PORT}`);
  console.log(`  Skirk assistant: ${SKIRK_ASSISTANT}`);
});
