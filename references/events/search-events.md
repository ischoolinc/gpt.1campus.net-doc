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

搜尋開始時發送，可能包含搜尋關鍵字。

```typescript
{
  type: 'web_search.started',
  item_id: string,       // 搜尋項目 ID
  query?: string,        // 搜尋查詢文字（v4.2 新增）
}
```

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `item_id` | `string` | ✅ | 搜尋項目 ID，用於關聯 started/completed |
| `query` | `string` | ❌ | 搜尋查詢文字，依 Provider 支援程度而定 |

### web_search.completed

搜尋完成時發送，包含來源連結資訊。

```typescript
{
  type: 'web_search.completed',
  item_id: string,                              // 搜尋項目 ID
  query?: string,                               // 搜尋查詢文字（v4.2 新增）
  sources?: Array<{ title: string, url: string }>,  // 來源連結（v4.2 新增）
}
```

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `item_id` | `string` | ✅ | 搜尋項目 ID |
| `query` | `string` | ❌ | 搜尋查詢文字 |
| `sources` | `Array<{ title, url }>` | ❌ | 搜尋來源連結（最多 8 筆），供前端顯示參考資料 |

> **v4.2 變更**: 移除 `results` 欄位（原始搜尋結果不再透傳至前端），改用語義更明確的 `sources` 欄位。

### 範例

**搜尋開始**：

```json
{
  "type": "web_search.started",
  "item_id": "srvtoolu_019Tw88ntTzYj1d2mkyo9vD2",
  "query": "台北市今天天氣"
}
```

**搜尋完成**：

```json
{
  "type": "web_search.completed",
  "item_id": "srvtoolu_019Tw88ntTzYj1d2mkyo9vD2",
  "query": "台北市今天天氣",
  "sources": [
    {
      "title": "台北市天氣預報 - 中央氣象署",
      "url": "https://www.cwa.gov.tw/V8/C/W/Town/Town.html?TID=6300100"
    },
    {
      "title": "台北天氣 | Weather.com",
      "url": "https://weather.com/zh-TW/weather/today/l/Taipei"
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

### 顯示搜尋進度與來源

```typescript
eventSource.addEventListener('web_search.started', (e) => {
  const { query } = JSON.parse(e.data);
  showSearchIndicator(query ? `🔍 正在搜尋：${query}` : '🔍 正在搜尋網路...');
});

eventSource.addEventListener('web_search.completed', (e) => {
  const { sources } = JSON.parse(e.data);
  hideSearchIndicator();

  if (sources && sources.length > 0) {
    showSearchSources(sources);
  }
});
```

### 顯示來源連結

```typescript
function showSearchSources(sources: Array<{ title: string, url: string }>) {
  const sourcesEl = document.createElement('div');
  sourcesEl.className = 'search-sources';
  sourcesEl.innerHTML = `
    <div class="sources-header">📚 參考來源</div>
    <ul>
      ${sources.map(s => `
        <li>
          <a href="${s.url}" target="_blank">${s.title}</a>
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
function createCollapsibleSources(sources: Array<{ title: string, url: string }>) {
  const MAX_VISIBLE = 3;
  const hasMore = sources.length > MAX_VISIBLE;

  return `
    <div class="sources">
      ${sources.slice(0, MAX_VISIBLE).map(renderSource).join('')}
      ${hasMore ? `
        <button class="show-more">
          顯示更多 (${sources.length - MAX_VISIBLE})
        </button>
        <div class="hidden-sources" style="display: none;">
          ${sources.slice(MAX_VISIBLE).map(renderSource).join('')}
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

**最後更新**: 2026-03-25 (v4.2 — 新增 `query`/`sources` 欄位，移除 `results`)
