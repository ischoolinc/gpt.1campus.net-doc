# Search 事件

Web 搜尋和檔案搜尋的事件序列。

---

## 概述

當模型啟用搜尋功能時，會透過這些事件通知前端搜尋進度和結果。

| 類型 | 說明 | 需要配置 |
|------|------|---------|
| Web Search | 網路搜尋 | Preset 啟用 `web_search` |
| File Search | 檔案/向量搜尋 | Preset 配置 Vector Store |

---

## Web Search 事件

### 事件列表

| 事件 | 角色 | 說明 |
|------|------|------|
| `web_search.started` | 信號 | 搜尋開始 |
| `web_search.completed` | 通知 | 搜尋完成（含結果） |

### web_search.started

```typescript
{
  type: 'web_search.started',
  item_id?: string,
  timestamp?: string
}
```

### web_search.completed

```typescript
{
  type: 'web_search.completed',
  item_id?: string,
  results?: Array<{
    title: string,
    url: string,
    snippet?: string
  }>,
  timestamp?: string
}
```

### 範例

```json
{
  "type": "web_search.completed",
  "item_id": "item_123",
  "results": [
    {
      "title": "台北市天氣預報",
      "url": "https://weather.example.com/taipei",
      "snippet": "今日台北市天氣晴朗，氣溫 25-30°C..."
    },
    {
      "title": "中央氣象署",
      "url": "https://www.cwa.gov.tw/",
      "snippet": "提供全台天氣預報資訊..."
    }
  ]
}
```

---

## File Search 事件

### 事件列表

| 事件 | 角色 | 說明 |
|------|------|------|
| `file_search.started` | 信號 | 搜尋開始 |
| `file_search.completed` | 通知 | 搜尋完成（含結果） |

### file_search.started

```typescript
{
  type: 'file_search.started',
  item_id?: string,
  timestamp?: string
}
```

### file_search.completed

```typescript
{
  type: 'file_search.completed',
  item_id?: string,
  results?: Array<{
    file_id: string,
    file_name: string,
    score?: number,
    content?: string
  }>,
  timestamp?: string
}
```

### 範例

```json
{
  "type": "file_search.completed",
  "item_id": "item_456",
  "results": [
    {
      "file_id": "file_abc",
      "file_name": "產品規格書.pdf",
      "score": 0.92,
      "content": "本產品支援以下功能..."
    },
    {
      "file_id": "file_def",
      "file_name": "使用手冊.docx",
      "score": 0.85,
      "content": "操作步驟如下..."
    }
  ]
}
```

---

## 事件流程

### Web Search

```
conversation.started
  → web_search.started
  → web_search.completed (含搜尋結果)
  → text.started
  → text.chunk (x N)    ← AI 根據搜尋結果回答
  → text.completed
  → conversation.completed
```

### File Search

```
conversation.started
  → file_search.started
  → file_search.completed (含搜尋結果)
  → text.started
  → text.chunk (x N)    ← AI 根據檔案內容回答
  → text.completed
  → conversation.completed
```

---

## 前端處理

### 顯示搜尋進度

```typescript
eventSource.addEventListener('web_search.started', () => {
  showSearchIndicator('🔍 正在搜尋網路...');
});

eventSource.addEventListener('web_search.completed', (e) => {
  const { results } = JSON.parse(e.data);
  hideSearchIndicator();

  if (results && results.length > 0) {
    showSearchResults(results);  // 顯示來源連結
  }
});
```

### 顯示搜尋來源

```typescript
function showSearchResults(results: SearchResult[]) {
  const sourcesEl = document.createElement('div');
  sourcesEl.className = 'search-sources';
  sourcesEl.innerHTML = `
    <div class="sources-header">📚 參考來源</div>
    <ul>
      ${results.map(r => `
        <li>
          <a href="${r.url}" target="_blank">${r.title}</a>
          ${r.snippet ? `<p>${r.snippet}</p>` : ''}
        </li>
      `).join('')}
    </ul>
  `;
  document.getElementById('chat')?.appendChild(sourcesEl);
}
```

---

## UI 設計建議

### 1. 搜尋指示器

搜尋可能需要幾秒鐘，提供明確的載入指示：

```css
.search-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #e3f2fd;
  border-radius: 8px;
}

.search-indicator .spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #2196f3;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
```

### 2. 來源引用

顯示 AI 參考的來源，增加可信度：

```css
.search-sources {
  margin-top: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  font-size: 0.9em;
}

.search-sources a {
  color: #1976d2;
  text-decoration: none;
}

.search-sources a:hover {
  text-decoration: underline;
}
```

### 3. 可折疊來源

來源列表可能很長，建議可折疊：

```typescript
function createCollapsibleSources(results: SearchResult[]) {
  const MAX_VISIBLE = 3;
  const hasMore = results.length > MAX_VISIBLE;

  return `
    <div class="sources">
      ${results.slice(0, MAX_VISIBLE).map(renderSource).join('')}
      ${hasMore ? `
        <button class="show-more">
          顯示更多 (${results.length - MAX_VISIBLE})
        </button>
        <div class="hidden-sources" style="display: none;">
          ${results.slice(MAX_VISIBLE).map(renderSource).join('')}
        </div>
      ` : ''}
    </div>
  `;
}
```

---

## 相關文件

- [Tool 事件](./tool-events.md) - 工具呼叫事件
- [Text 事件](./text-events.md) - 文字輸出事件

---

**最後更新**: 2025-12-13
