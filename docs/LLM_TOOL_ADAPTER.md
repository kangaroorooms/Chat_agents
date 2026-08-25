# LLM Tool Adapter

The `LLMToolAdapter` translates LLM-style function/tool-calling requests into the internal planning and execution flow.

Responsibilities:

- Expose available tools (name, description, provider-neutral parameter description)
- Validate incoming tool calls against tool input schemas
- Convert LLM tool call into a `ToolPlan` (single-step) and invoke `AIPlanner.executePlan`
- Return structured `ToolExecutionResult[]` back to the caller (AIService)

Design notes:

- Adapter is provider-neutral: it does not import OpenAI or any provider SDKs.
- The `planner` is responsible for sequencing and execution semantics. Adapter only builds a single-step plan for direct tool calls from the LLM.
- The `toolRegistry` continues to own registration and direct execution.

Usage:

From the AI runtime (LLM integration layer), call:

```ts
const response = await aiService.invokeLLMTool('searchKnowledge', { query: 'how to reset password', companyId: 'c1' })
```

The response is an object with `{ success: boolean, results?: ToolExecutionResult[], error?: string }`.
