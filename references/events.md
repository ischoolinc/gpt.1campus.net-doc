# V4 API 事件參考

> 📁 事件文檔已遷移至 **[events/](./events/)** 目錄，提供更完整的分類說明。

---

## 快速導覽

| 文件 | 事件系列 | 說明 |
|------|---------|------|
| [總覽](./events/overview.md) | - | 事件索引、實作層級、常見流程 |
| [設計原理](./events/design-principles.md) | - | 事件設計原則與決策記錄 |
| [Conversation](./events/conversation-events.md) | `conversation.*` | 對話生命週期（started/paused/resumed/completed） |
| [Iteration](./events/iteration-events.md) | `iteration.*` | 多輪迭代追蹤 |
| [Text](./events/text-events.md) | `text.*` | 文字輸出串流 |
| [Tool](./events/tool-events.md) | `tool.*` | 工具呼叫（含 Client-side Function Call） |
| [Reasoning](./events/reasoning-events.md) | `reasoning.*` | 推理/思考過程（o1/o3、Claude） |
| [Search](./events/search-events.md) | `web_search.*`, `file_search.*` | 搜尋功能 |

---

## 前端實作建議

### Level 1：基礎實作（必須）

```typescript
eventSource.addEventListener('text.chunk', handler);
eventSource.addEventListener('conversation.completed', handler);
eventSource.addEventListener('conversation.error', handler);
```

### Level 2：完整實作（建議）

```typescript
// Level 1 +
eventSource.addEventListener('conversation.started', handler);
eventSource.addEventListener('text.started', handler);
eventSource.addEventListener('text.completed', handler);
eventSource.addEventListener('tool.call', handler);
eventSource.addEventListener('tool.progress', handler);  // 執行進度
eventSource.addEventListener('tool.result', handler);
```

### Level 3：進階實作

```typescript
// Level 2 +
eventSource.addEventListener('tool.execute', handler);         // Client-side
eventSource.addEventListener('conversation.paused', handler);
eventSource.addEventListener('conversation.resumed', handler);
eventSource.addEventListener('reasoning.chunk', handler);
```

---

## 相關文件

- [請求參數](./request.md) - API 請求格式
- [回應格式](./response.md) - JSON 模式回應
- [錯誤代碼](./error-codes.md) - 錯誤處理

---

**最後更新**: 2026-03-10
