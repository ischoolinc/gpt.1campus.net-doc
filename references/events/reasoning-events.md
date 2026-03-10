# Reasoning 事件

模型推理/思考過程的事件序列（僅支援特定模型）。

---

## 概述

部分模型在回應前會進行「思考」，這些思考過程可以透過 Reasoning 事件串流給前端顯示。

```
reasoning.started → reasoning.chunk (x N) → reasoning.completed
```

---

## 支援模型

| Provider | 模型 |
|----------|------|
| OpenAI | o1, o3 系列 |
| Anthropic | Claude Opus 4, Sonnet 4, Sonnet 3.7 |

> 一般模型（如 GPT-4o, GPT-4o-mini）不會發送這些事件。

---

## 事件列表

| 事件 | 角色 | 說明 |
|------|------|------|
| `reasoning.started` | 信號 | 推理開始 |
| `reasoning.chunk` | 通知 | 推理內容片段 |
| `reasoning.completed` | 信號 | 推理完成 |

---

## reasoning.started

推理/思考開始事件。

### 事件結構

```typescript
{
  type: 'reasoning.started',
  item_id?: string,
  timestamp?: string
}
```

---

## reasoning.chunk

推理內容片段，串流模式下會多次發送。

### 事件結構

```typescript
{
  type: 'reasoning.chunk',
  text: string,           // 思考內容片段
  item_id?: string
}
```

### 範例

連續收到的事件：
```json
{ "type": "reasoning.chunk", "text": "讓我思考" }
{ "type": "reasoning.chunk", "text": "一下這個問題" }
{ "type": "reasoning.chunk", "text": "..." }
{ "type": "reasoning.chunk", "text": "\n首先，" }
{ "type": "reasoning.chunk", "text": "我需要分析" }
```

---

## reasoning.completed

推理/思考完成事件。

### 事件結構

```typescript
{
  type: 'reasoning.completed',
  item_id?: string,
  timestamp?: string
}
```

---

## 事件流程

### 含推理的對話

```
conversation.started
  → model.in_progress
  → reasoning.started
  → reasoning.chunk (x N)
  → reasoning.completed
  → text.started
  → text.chunk (x N)
  → text.completed
  → conversation.completed
```

### 順序說明

1. **推理在前**：模型先「思考」再「回答」
2. **不重疊**：`reasoning.*` 完成後才開始 `text.*`
3. **可選顯示**：前端可以選擇是否顯示思考過程

---

## 前端處理

### 基本實作（顯示思考過程）

```typescript
let isThinking = false;
let thinkingText = '';

eventSource.addEventListener('reasoning.started', () => {
  isThinking = true;
  thinkingText = '';
  showThinkingUI();
});

eventSource.addEventListener('reasoning.chunk', (e) => {
  const { text } = JSON.parse(e.data);
  thinkingText += text;
  updateThinkingContent(thinkingText);
});

eventSource.addEventListener('reasoning.completed', () => {
  isThinking = false;
  finalizeThinkingUI();
});
```

### 進階實作（可折疊思考區塊）

```typescript
class ReasoningHandler {
  private container: HTMLElement;
  private isExpanded = false;

  constructor() {
    this.container = this.createCollapsibleBlock();
  }

  private createCollapsibleBlock(): HTMLElement {
    const block = document.createElement('div');
    block.className = 'reasoning-block collapsed';
    block.innerHTML = `
      <div class="reasoning-header">
        <span class="icon">🤔</span>
        <span class="label">思考過程</span>
        <button class="toggle">展開</button>
      </div>
      <div class="reasoning-content"></div>
    `;

    block.querySelector('.toggle')?.addEventListener('click', () => {
      this.toggle();
    });

    return block;
  }

  handleStarted() {
    this.container.classList.add('active');
    document.getElementById('chat')?.appendChild(this.container);
  }

  handleChunk(text: string) {
    const content = this.container.querySelector('.reasoning-content');
    if (content) {
      content.textContent += text;
    }
  }

  handleCompleted() {
    this.container.classList.remove('active');
    this.container.classList.add('completed');
  }

  private toggle() {
    this.isExpanded = !this.isExpanded;
    this.container.classList.toggle('collapsed', !this.isExpanded);
    this.container.querySelector('.toggle')!.textContent =
      this.isExpanded ? '收起' : '展開';
  }
}
```

### 簡單實作（只顯示指示器）

```typescript
eventSource.addEventListener('reasoning.started', () => {
  showIndicator('🤔 正在思考...');
});

eventSource.addEventListener('reasoning.completed', () => {
  hideIndicator();
});

// 忽略 reasoning.chunk，不顯示思考內容
```

---

## UI 設計建議

### 1. 視覺區分

思考內容和回答內容應該有明顯區分：

```css
.reasoning-content {
  background: #f5f5f5;
  border-left: 3px solid #9e9e9e;
  padding: 12px;
  font-style: italic;
  color: #666;
}

.text-content {
  background: white;
  padding: 12px;
}
```

### 2. 預設收起

思考過程通常較長，建議預設收起：

- 顯示「🤔 思考中...」或「💭 已思考 X 秒」
- 提供展開按鈕讓有興趣的使用者查看

### 3. 載入動畫

思考過程可能較長，提供適當的載入動畫：

```css
.thinking-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.thinking-indicator .dots {
  animation: blink 1.4s infinite both;
}

@keyframes blink {
  0%, 80%, 100% { opacity: 0; }
  40% { opacity: 1; }
}
```

---

## 相關文件

- [Text 事件](./text-events.md) - 文字輸出（結構類似）
- [Conversation 事件](./conversation-events.md) - 對話生命週期

---

**最後更新**: 2025-12-13
