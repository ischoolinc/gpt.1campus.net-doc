// 1Campus GPT V4 API — 二階段範例後端
//
// 用途：
// 1. 藏 V4 API Key（不讓前端看到）
// 2. 呼叫 /v4/prepare 取得 run_token
// 3. 把 run_token 吐給前端（前端再用 EventSource 連 /v4/response/:run_token）
//
// 啟動：
//   V4_API_KEY=prj_xxx.key_yyy node server.js
//
// 依賴：express（pnpm install express）

const express = require("express");

const PORT = process.env.PORT || 3001;
const V4_BASE = process.env.V4_BASE || "https://gpt.1campus.net";
const V4_API_KEY = process.env.V4_API_KEY;
const PRESET_CODE = process.env.PRESET_CODE || "preset_zle7gp7k";

if (!V4_API_KEY) {
  console.error("✗ 缺少環境變數 V4_API_KEY");
  console.error("  範例：V4_API_KEY=prj_xxx.key_yyy node server.js");
  process.exit(1);
}

const app = express();
app.use(express.json());
app.use(express.static(__dirname)); // 直接服務同目錄的 index.html

// POST /api/prepare
//   前端送：{ input, thread_id? }
//   後端回：{ run_token, thread_id, user_msg_id }
app.post("/api/prepare", async (req, res) => {
  const { input, thread_id, credential } = req.body;

  if (!input) {
    return res.status(400).json({ error: "input is required" });
  }

  try {
    const body = { name: PRESET_CODE, input };
    if (thread_id) body.thread_id = thread_id;
    // credential 透傳給 V4，function call 會用裡面的欄位（如 accessToken）
    if (credential && Object.keys(credential).length > 0) {
      body.credential = credential;
    }

    const upstream = await fetch(`${V4_BASE}/v4/prepare`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${V4_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      console.error("✗ /v4/prepare failed", upstream.status, data);
      return res.status(upstream.status).json(data);
    }

    // 一併把 V4 base 給前端，前端才知道要打哪
    res.json({ ...data, sse_url: `${V4_BASE}/v4/response/${data.run_token}` });
  } catch (err) {
    console.error("✗ proxy error", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✓ Server: http://localhost:${PORT}`);
  console.log(`  Preset: ${PRESET_CODE}`);
  console.log(`  V4: ${V4_BASE}`);
});
