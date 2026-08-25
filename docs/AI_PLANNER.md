# AI Planning Engine

This document describes the `AIPlanner` service responsible for determining if AI-invoked tools should run, building execution plans, executing them (sequentially for now), and returning results to the AI service.

Design goals

- Keep planner independent of HTTP, Socket.IO, and workflow — it only orchestrates tool selection and execution via the `toolRegistry`.
- Planner decides whether tools are needed based on simple heuristics (rule-based) initially; design supports more advanced ML-based intent classification later.
- Tool execution is delegated to `toolRegistry` which performs input validation and runs tool implementations.
- Support sequential execution now; design allows parallel execution later (plan.mode).

Files

- `src/modules/ai/planner/planner.types.ts` — Planner interfaces and types
- `src/modules/ai/planner/planner.service.ts` — Rule-based planner implementation

Flow

1. `AIService.generateResponseStream()` calls `getAIPlanner().planForQuery(userMessage, context)` to obtain a `ToolPlan` or null.
2. If a plan is returned, AIService calls `planner.executePlan(plan)` to execute steps sequentially.
3. Planner returns an array of `ToolExecutionResult` entries (one per step) containing toolName and result.
4. AIService integrates results into the prompt context (e.g., `toolResults` and `retrievedDocuments`) before calling the LLM.

Execution semantics

- Sequential: steps are executed in order; if a step errors, execution stops and remaining steps are not run.
- Parallel: reserved for future implementation; planner currently throws if `plan.mode === 'parallel'`.

Extensibility

- Replace heuristics with an intent classifier: `planForQuery` can call a classifier service and translate intent to tools.
- Support conditional branching, retries, and timeouts per step.
- Add permissions checks before executing tools.
