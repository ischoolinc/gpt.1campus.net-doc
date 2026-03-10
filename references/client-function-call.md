# Client-side Function Call 指南

**版本**: v4.2
**最後更新**: 2025-12-16
**適用對象**: 前端開發者

---

## 概述

Client-side Function Call 讓 AI 能夠**控制前端 UI**。當 AI 決定需要操作使用者介面時，會發送請求給前端執行，前端完成後回傳結果，AI 再根據結果繼續對話。

### 與一般 Function Call 的差異

| 特性 | Server-side | Client-side |
|------|-------------|-------------|
| 執行位置 | 後端 | **前端** |
| HTTP 請求 | 一次完成 | **兩次請求** |
| 前端角色 | 觀察者（顯示進度） | **執行者**（執行並回傳） |
| 用途 | 查資料庫、呼叫外部 API | 控制 UI、操作表單 |

### 使用場景

- 調整設定介面參數（溫度、模型選擇）
- 控制表單欄位
- 觸發前端動作（滾動、導航、切換頁籤）
- 操作任何前端 UI 元件
- 重新整理資料列表

---

## 完整流程

```
┌─────────────────────────────────────────────────────────────────┐
│                      第一輪 HTTP 請求                            │
├─────────────────────────────────────────────────────────────────┤
│  前端                           後端                             │
│    │                              │                              │
│    │──── POST /v4/response ──────▶│                              │
│    │     { input: "把溫度調高" }    │                              │
│    │                              │                              │
│    │◀─── SSE 事件流 ─────────────│                              │
│    │     conversation.started     │                              │
│    │     text.chunk...            │  AI: "好的，我來幫你調整..."  │
│    │     tool.execute ◀───────────│─ 請求前端執行                 │
│    │     conversation.paused      │  SSE 結束                    │
│    │                              │                              │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      前端執行 UI 操作                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│    前端收到 tool.execute，執行對應的 UI 操作                       │
│    例如：document.getElementById('temperature').value = 0.8      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      第二輪 HTTP 請求                            │
├─────────────────────────────────────────────────────────────────┤
│  前端                           後端                             │
│    │                              │                              │
│    │──── POST /v4/response ──────▶│                              │
│    │     { thread_id, tool_outputs }                             │
│    │                              │                              │
│    │◀─── SSE 事件流 ─────────────│                              │
│    │     conversation.resumed     │                              │
│    │     text.chunk...            │  AI: "已經把溫度調到 0.8 了"  │
│    │     conversation.completed   │                              │
│    │                              │                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 事件規格

### tool.execute

當 AI 呼叫 client-side function 時，後端發送此事件**請求前端執行**：

```typescript
interface ToolExecuteEvent {
  type: 'tool.execute';
  call_id: string;           // 調用 ID（回傳時必須帶上）
  name: string;              // 工具名稱
  arguments: string;         // 工具參數（JSON 字串）
  timestamp: string;
  provider_metadata?: any;   // Provider 特定資料（前端不需處理）
}
```

**範例**：
```json
{
  "type": "tool.execute",
  "call_id": "call_abc123",
  "name": "set_temperature",
  "arguments": "{\"value\": 0.8}",
  "timestamp": "2025-12-16T10:00:01Z"
}
```

### conversation.paused

SSE 結束，等待前端回應：

```typescript
interface ConversationPausedEvent {
  type: 'conversation.paused';
  reason: 'client_tool_execution';
  thread_id: number;
  pending_tools: Array<{
    call_id: string;
    name: string;
    arguments: string;
  }>;
  timestamp: string;
}
```

**重要**：`pending_tools` 包含所有需要執行的工具，前端可以選擇：
- 監聽 `tool.execute` 即時處理（進階 UI）
- 只看 `conversation.paused` 批次處理（簡單）

### conversation.resumed

第二輪請求成功，對話恢復：

```typescript
interface ConversationResumedEvent {
  type: 'conversation.resumed';
  thread_id: number;
  timestamp: string;
}
```

---

## 請求規格

### 第二輪請求格式

前端執行完成後，發送第二輪請求恢復對話：

```typescript
// POST /v4/response
{
  thread_id: number,           // 必填，從 conversation.started 取得
  tool_outputs: [{             // 必填
    call_id: string,           // 對應 tool.execute 的 call_id
    output: string             // 執行結果（JSON 字串）
  }],
  stream?: boolean             // 選填，預設 false
}
```

**最小請求**：
```json
{
  "thread_id": 42,
  "tool_outputs": [
    {
      "call_id": "call_abc123",
      "output": "{\"success\": true, \"new_value\": 0.8}"
    }
  ]
}
```

**注意**：
- 不需要 `name`、`model`、`input`（後端從 thread 自動取得）
- 只需要 `thread_id` + `tool_outputs`

---

## 前端實作範例

### 完整 TypeScript 範例

```typescript
class ChatClient {
  private threadId?: number;
  private apiKey: string;

  // ========================================
  // Client-side Function Handlers
  // ========================================
  private toolHandlers: Record<string, (args: any) => Promise<any>> = {
    // 設定溫度
    set_temperature: async ({ value }) => {
      const input = document.getElementById('temperature-input') as HTMLInputElement;
      input.value = String(value);
      input.dispatchEvent(new Event('change'));
      return { success: true, new_value: value };
    },

    // 設定模型
    set_model: async ({ model }) => {
      const select = document.getElementById('model-select') as HTMLSelectElement;
      select.value = model;
      select.dispatchEvent(new Event('change'));
      return { success: true, model };
    },

    // 滾動到指定區域
    scroll_to_section: async ({ section }) => {
      const element = document.getElementById(section);
      if (!element) {
        return { success: false, error: `Section not found: ${section}` };
      }
      element.scrollIntoView({ behavior: 'smooth' });
      return { success: true };
    },

    // 切換頁籤
    switch_tab: async ({ tab_id }) => {
      const tab = document.querySelector(`[data-tab="${tab_id}"]`) as HTMLElement;
      if (!tab) {
        return { success: false, error: `Tab not found: ${tab_id}` };
      }
      tab.click();
      return { success: true, tab_id };
    }
  };

  // ========================================
  // SSE 事件處理
  // ========================================
  handleEvent(event: any) {
    switch (event.type) {
      case 'conversation.started':
        this.threadId = event.thread_id;
        break;

      case 'tool.execute':
        // 可選：即時顯示執行狀態
        this.showExecutingUI(event.name);
        break;

      case 'conversation.paused':
        if (event.reason === 'client_tool_execution') {
          this.handleClientToolExecution(event.pending_tools);
        }
        break;

      case 'conversation.resumed':
        console.log('對話已恢復');
        break;
    }
  }

  // ========================================
  // 執行 Client Tools
  // ========================================
  private async handleClientToolExecution(pendingTools: any[]) {
    const results: Array<{ call_id: string; output: string }> = [];

    for (const tool of pendingTools) {
      const result = await this.executeClientTool(tool.name, tool.arguments);
      results.push({
        call_id: tool.call_id,
        output: JSON.stringify(result)
      });
    }

    // 發起第二輪請求
    await this.submitToolOutputs(results);
  }

  private async executeClientTool(name: string, argsJson: string): Promise<any> {
    const handler = this.toolHandlers[name];

    if (!handler) {
      return { success: false, error: `Unknown tool: ${name}` };
    }

    try {
      const args = JSON.parse(argsJson);
      return await handler(args);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // ========================================
  // 提交結果，恢復對話
  // ========================================
  private async submitToolOutputs(toolOutputs: Array<{ call_id: string; output: string }>) {
    const response = await fetch('/v4/response', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        thread_id: this.threadId,
        tool_outputs: toolOutputs,
        stream: true
      })
    });

    // 處理第二輪 SSE 事件...
    this.handleSSEResponse(response);
  }

  private showExecutingUI(toolName: string) {
    // 顯示「正在執行 set_temperature...」
  }

  private handleSSEResponse(response: Response) {
    // 處理 SSE 串流...
  }
}
```

### Angular 範例（搭配 RxJS）

```typescript
@Injectable({ providedIn: 'root' })
export class ClientToolService {
  private toolHandlers = new Map<string, (args: any) => Promise<any>>();

  constructor() {
    this.registerDefaultHandlers();
  }

  // 註冊 handler
  registerHandler(name: string, handler: (args: any) => Promise<any>) {
    this.toolHandlers.set(name, handler);
  }

  // 執行工具
  async execute(name: string, argsJson: string): Promise<any> {
    const handler = this.toolHandlers.get(name);

    if (!handler) {
      return { success: false, error: `Unknown tool: ${name}` };
    }

    try {
      const args = JSON.parse(argsJson);
      return await handler(args);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // 批次執行
  async executeAll(pendingTools: any[]): Promise<Array<{ call_id: string; output: string }>> {
    const results = await Promise.all(
      pendingTools.map(async (tool) => ({
        call_id: tool.call_id,
        output: JSON.stringify(await this.execute(tool.name, tool.arguments))
      }))
    );
    return results;
  }

  private registerDefaultHandlers() {
    // 在這裡註冊預設的 handlers...
  }
}
```

---

## 錯誤處理

### 執行失敗

即使執行失敗，也**必須**回傳 `tool_outputs`，讓 AI 知道失敗原因：

```json
{
  "thread_id": 42,
  "tool_outputs": [
    {
      "call_id": "call_abc123",
      "output": "{\"success\": false, \"error\": \"找不到指定的 UI 元素\"}"
    }
  ]
}
```

AI 會根據錯誤訊息調整回應，例如：「抱歉，我找不到那個元素，請確認...」

### 常見錯誤碼

| 錯誤 | HTTP Status | 說明 |
|------|-------------|------|
| 無效的 call_id | 400 | `call_id` 不存在於 thread 歷史中 |
| 重複提交 | 400 | 同一個 `call_id` 被提交兩次 |
| Thread 不存在 | 404 | `thread_id` 無效 |

---

## 注意事項

### 必須保留的資訊

| 資訊 | 來源 | 用途 |
|------|------|------|
| `thread_id` | `conversation.started` | 第二輪請求必填 |
| `call_id` | `tool.execute` 或 `pending_tools` | 對應執行結果 |

### JSON 格式

- `arguments` 是 JSON **字串**（需要 `JSON.parse`）
- `output` 也是 JSON **字串**（需要 `JSON.stringify`）

### 錯誤也要回傳

即使前端執行失敗，也要回傳 `tool_outputs`。不回傳會導致對話永久暫停。

### provider_metadata

`tool.execute` 事件可能包含 `provider_metadata` 欄位。前端**不需要理解或處理**此欄位，它是給後端內部使用的。

---

## 常見問題

### Q: 可以同時執行多個 client tools 嗎？

可以。`conversation.paused` 的 `pending_tools` 陣列可能包含多個工具。前端應該執行全部，然後一次提交所有結果：

```json
{
  "thread_id": 42,
  "tool_outputs": [
    { "call_id": "call_1", "output": "{...}" },
    { "call_id": "call_2", "output": "{...}" }
  ]
}
```

### Q: 如果使用者關閉頁面，對話會怎樣？

對話會保持在 paused 狀態。下次使用者回來時，可以：
1. 查詢 thread 狀態
2. 重新執行 pending tools
3. 提交 `tool_outputs` 恢復對話

### Q: tool.execute 和 conversation.paused 哪個先？

`tool.execute` 先發送（每個工具一個），`conversation.paused` 最後發送（包含所有 pending_tools）。

建議：
- **簡單實作**：只監聽 `conversation.paused`
- **進階 UI**：同時監聽 `tool.execute` 顯示即時狀態

### Q: 第二輪請求需要帶 Authorization header 嗎？

需要。第二輪請求和第一輪一樣，都需要帶上 API Key：

```
Authorization: Bearer prj_xxx.key_yyy
```

---

## 相關文件

- [Request 參數規格](./request.md) - `tool_outputs` 參數詳細說明
- [Tool 事件](./events/tool-events.md) - 所有 tool 相關事件
- [Conversation 事件](./events/conversation-events.md) - `paused` / `resumed` 事件
- [Events 總覽](./events.md) - SSE 事件完整列表

---

**Happy Coding!** 🎉
