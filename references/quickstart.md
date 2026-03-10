# V4 API 快速入門

讓你在 10 分鐘內寫出一個串流聊天程式。

---

## 1. 發送請求

**端點**: `POST /v4/response`

**認證**: `Authorization: Bearer <your-api-key>`

### 最簡單的請求

```bash
curl -X POST https://gpt.1campus.net/v4/response \
  -H "Authorization: Bearer prj_xxx.key_yyy" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "gpt-4o-mini",
    "input": "你好",
    "stream": true
  }'
```

### 請求參數

| 參數 | 必填 | 說明 |
|-----|------|-----|
| `name` | ✅ | AI 助理名稱（如 `gpt-4o-mini`） |
| `input` | ✅ | 使用者輸入的文字 |
| `stream` | ❌ | 設為 `true` 啟用串流 |
| `thread_id` | ❌ | 多輪對話用，從前次回應取得 |

---

## 2. 接收串流事件

串流回應使用 **Server-Sent Events (SSE)** 格式：

```
event: text.chunk
data: {"type":"text.chunk","content":"你好"}

event: text.chunk
data: {"type":"text.chunk","content":"！我是"}

event: text.chunk
data: {"type":"text.chunk","content":" AI 助理"}
```

### 核心事件

| 事件 | 說明 | 資料欄位 |
|-----|------|---------|
| `conversation.started` | 對話開始 | `thread_id` |
| `text.chunk` | **文字片段**（逐字輸出） | `content` |
| `text.completed` | 文字結束 | `content`（完整文字） |
| `conversation.completed` | 對話結束 | `status`, `token_usage` |
| `conversation.error` | 發生錯誤 | `error_code`, `message` |

---

## 3. 前端實作範例

### JavaScript（使用 fetch）

```javascript
async function chat(input, threadId) {
  const response = await fetch('/v4/response', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer prj_xxx.key_yyy',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'gpt-4o-mini',
      input: input,
      stream: true,
      thread_id: threadId  // 可選，多輪對話用
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let newThreadId = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));

        switch (data.type) {
          case 'conversation.started':
            newThreadId = data.thread_id;
            break;
          case 'text.chunk':
            fullText += data.content;
            updateUI(fullText);  // 即時更新畫面
            break;
          case 'conversation.completed':
            console.log('完成！Token 用量:', data.token_usage);
            break;
          case 'conversation.error':
            console.error('錯誤:', data.message);
            break;
        }
      }
    }
  }

  return { text: fullText, threadId: newThreadId };
}
```

### 使用 EventSource（更簡潔）

```javascript
function chatWithSSE(input) {
  // 注意：EventSource 不支援 POST，需用二階段 API 或改用 fetch
  const params = new URLSearchParams({
    name: 'gpt-4o-mini',
    input: input,
    stream: 'true'
  });

  const eventSource = new EventSource(`/v4/response?${params}`);
  let fullText = '';

  eventSource.addEventListener('text.chunk', (e) => {
    const { content } = JSON.parse(e.data);
    fullText += content;
    document.getElementById('output').textContent = fullText;
  });

  eventSource.addEventListener('conversation.completed', () => {
    eventSource.close();
  });

  eventSource.addEventListener('conversation.error', (e) => {
    const { message } = JSON.parse(e.data);
    alert('錯誤: ' + message);
    eventSource.close();
  });
}
```

---

## 4. 多輪對話

多輪對話的關鍵是 **`thread_id`**：

1. **第一次對話**：不帶 `thread_id`，系統會自動建立新的對話串
2. **從回應取得**：`conversation.started` 事件會回傳 `thread_id`
3. **後續對話**：帶上同一個 `thread_id`，系統會自動載入歷史訊息
4. **不需手動維護歷史**：系統會記住所有對話內容

### 完整範例

```javascript
class ChatSession {
  constructor() {
    this.threadId = null;
  }

  async send(input) {
    const response = await fetch('https://gpt.1campus.net/v4/response', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer prj_xxx.key_yyy',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'gpt-4o-mini',
        input: input,
        stream: true,
        thread_id: this.threadId  // 第一次是 null，之後帶上
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      for (const line of decoder.decode(value).split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = JSON.parse(line.slice(6));

        if (data.type === 'conversation.started') {
          // 🔑 關鍵：保存 thread_id 給下一輪使用
          this.threadId = data.thread_id;
        }
        if (data.type === 'text.chunk') {
          fullText += data.content;
        }
      }
    }

    return fullText;
  }
}

// 使用範例
const chat = new ChatSession();

await chat.send('記住我叫小明');
// → "好的，我記住了，你叫小明。"

await chat.send('我叫什麼名字？');
// → "你叫小明。"  ← AI 記得上一輪的內容

await chat.send('用英文說我的名字');
// → "Your name is Xiao Ming."  ← 持續記得整個對話脈絡
```

### 重點提醒

- ✅ `thread_id` 只需要保存一次，後續對話持續使用同一個
- ✅ 系統自動管理對話歷史，前端不需要維護 messages 陣列
- ❌ 不要每次都建立新的 thread（會失去對話記憶）

---

## 5. 非串流模式（簡單場景）

```javascript
const response = await fetch('/v4/response', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer prj_xxx.key_yyy',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'gpt-4o-mini',
    input: '你好'
    // stream 預設為 false
  })
});

const result = await response.json();
console.log(result.outputs[0].text);  // AI 完整回應
console.log(result.thread_id);        // 多輪對話用
```

---

## 6. 錯誤處理

```javascript
// HTTP 錯誤
if (!response.ok) {
  const error = await response.json();
  console.error(error.error.code, error.error.message);
}

// 常見錯誤碼
// 401 - API Key 無效
// 404 - AI 助理不存在
// 429 - 請求太頻繁
// 502 - AI 服務暫時不可用
```

---

## 快速參考

```
事件流程：
conversation.started → text.chunk* → text.completed → conversation.completed
                                                    ↘ conversation.error（如果失敗）

text.chunk 格式：
{"type": "text.chunk", "content": "片段文字"}
```
