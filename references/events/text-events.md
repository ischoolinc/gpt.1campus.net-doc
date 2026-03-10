# Text 事件

模型產生文字輸出時的事件序列。

---

## 概述

這是最常見的事件類型，用於串流輸出 AI 的文字回應。

```
text.started → text.chunk (x N) → text.completed
```

---

## 事件列表

| 事件 | 角色 | 說明 |
|------|------|------|
| `text.started` | 信號 | 文字輸出開始 |
| `text.chunk` | 通知 | 文字片段（串流） |
| `text.completed` | 信號 | 文字輸出完成 |

---

## text.started

文字輸出開始事件。

### 事件結構

```typescript
{
  type: 'text.started',
  timestamp?: string
}
```

### 前端處理

```typescript
eventSource.addEventListener('text.started', () => {
  // 準備接收文字
  showTypingIndicator();
  currentText = '';
});
```

---

## text.chunk

文字片段事件，串流模式下會多次發送。

### 事件結構

```typescript
{
  type: 'text.chunk',
  content: string    // 文字片段
}
```

### 範例

連續收到的事件：
```json
{ "type": "text.chunk", "content": "你" }
{ "type": "text.chunk", "content": "好" }
{ "type": "text.chunk", "content": "！" }
{ "type": "text.chunk", "content": "我是" }
{ "type": "text.chunk", "content": " AI" }
{ "type": "text.chunk", "content": " 助理" }
```

### 前端處理

```typescript
let currentText = '';

eventSource.addEventListener('text.chunk', (e) => {
  const { content } = JSON.parse(e.data);

  // 累加文字
  currentText += content;

  // 即時更新 UI
  updateMessageContent(currentText);
});
```

---

## text.completed

文字輸出完成事件，包含完整的文字內容。

### 事件結構

```typescript
{
  type: 'text.completed',
  content: string    // 完整文字
}
```

### 範例

```json
{
  "type": "text.completed",
  "content": "你好！我是 AI 助理，有什麼可以幫助你的嗎？"
}
```

### 前端處理

```typescript
eventSource.addEventListener('text.completed', (e) => {
  const { content } = JSON.parse(e.data);

  // 確保最終內容正確（以 completed 為準）
  finalizeMessage(content);

  // 隱藏打字指示器
  hideTypingIndicator();
});
```

---

## 實作建議

### 1. 即時 vs 最終

- **即時顯示**：使用 `text.chunk` 累加內容
- **最終確認**：以 `text.completed` 的 `content` 為準

**為什麼？** 網路問題可能導致 chunk 遺失，`completed` 提供完整備份。

### 2. Markdown 渲染

```typescript
eventSource.addEventListener('text.chunk', (e) => {
  const { content } = JSON.parse(e.data);
  currentText += content;

  // 即時渲染 Markdown（可能有性能考量）
  renderMarkdown(currentText);
});

eventSource.addEventListener('text.completed', (e) => {
  const { content } = JSON.parse(e.data);

  // 最終渲染，確保完整
  renderMarkdown(content);
});
```

### 3. 打字效果

如果想要打字機效果，可以用 queue 控制：

```typescript
const charQueue: string[] = [];
let isTyping = false;

eventSource.addEventListener('text.chunk', (e) => {
  const { content } = JSON.parse(e.data);
  charQueue.push(...content.split(''));

  if (!isTyping) {
    typeNextChar();
  }
});

function typeNextChar() {
  if (charQueue.length === 0) {
    isTyping = false;
    return;
  }

  isTyping = true;
  const char = charQueue.shift();
  appendChar(char);

  setTimeout(typeNextChar, 30); // 30ms per char
}
```

---

## 完整範例

```typescript
class TextStreamHandler {
  private currentText = '';
  private messageElement: HTMLElement;

  constructor(messageElement: HTMLElement) {
    this.messageElement = messageElement;
  }

  handleStarted() {
    this.currentText = '';
    this.messageElement.textContent = '';
    this.messageElement.classList.add('typing');
  }

  handleChunk(content: string) {
    this.currentText += content;
    this.messageElement.textContent = this.currentText;
  }

  handleCompleted(content: string) {
    // 以 completed 內容為準
    this.currentText = content;
    this.messageElement.textContent = content;
    this.messageElement.classList.remove('typing');
  }
}

// 使用
const handler = new TextStreamHandler(document.getElementById('message'));

eventSource.addEventListener('text.started', () => handler.handleStarted());
eventSource.addEventListener('text.chunk', (e) => {
  handler.handleChunk(JSON.parse(e.data).content);
});
eventSource.addEventListener('text.completed', (e) => {
  handler.handleCompleted(JSON.parse(e.data).content);
});
```

---

## 相關文件

- [Reasoning 事件](./reasoning-events.md) - 推理/思考過程（類似結構）
- [Conversation 事件](./conversation-events.md) - 對話生命週期

---

**最後更新**: 2025-12-13
