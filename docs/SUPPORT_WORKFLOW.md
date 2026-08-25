# Customer Support Workflow Design

This document defines the customer support workflow for the realtime support platform. It focuses on business lifecycle design and how the Conversation / Message domains should behave in production.

## 1. Conversation lifecycle

A conversation represents a single customer support interaction between a customer and one or more agents, optionally assisted by AI.

States:
- `OPEN`: Conversation is active and the customer or agent may continue messaging.
- `PENDING`: Conversation is waiting for an agent response, follow-up, or external action.
- `CLOSED`: Conversation is resolved and no new messages are expected.
- `ARCHIVED`: Conversation is closed and moved out of active routing for reporting or storage.

Queue states:
- `NEW`: Conversation has been created but not assigned to an agent.
- `ASSIGNED`: Conversation is assigned to a primary agent or owner.
- `TRANSFERRED`: Conversation was moved from one agent to another.
- `ESCALATED`: Conversation has been elevated for higher-level support or supervisor review.
- `ON_HOLD`: Conversation is paused pending customer reply, third-party action, or follow-up.

Lifecycle events:
- `create`: a customer opens a new or existing conversation.
- `assign`: an agent or system takes ownership.
- `transfer`: ownership moves to another agent.
- `escalate`: an agent escalates to supervisor or specialized queue.
- `hold`: a conversation is temporarily paused.
- `resume`: conversation returns to active handling.
- `close`: conversation is resolved and marked closed.
- `reopen`: a closed conversation returns to active work.

## 2. Assignment lifecycle

Assignment is the process of connecting a conversation to one primary agent.

Rules:
- A conversation may exist in `NEW` queue state with no owner.
- When an agent accepts or is assigned a conversation, `ownerId` is set and `queueState` becomes `ASSIGNED`.
- The assignment record also tracks `assignedAt` and `assignedById`.
- If the owner changes, the state becomes `TRANSFERRED` and the new owner is set.
- If an escalation occurs, the state becomes `ESCALATED` while owner remains set to the escalation target.
- If assignment is removed but conversation remains active, the state may return to `NEW` or `ON_HOLD` depending on queue rules.

## 3. Agent participation

Agent participation is managed through:
- `ownerId`: primary agent responsible for the conversation
- `participants`: conversation participants, including customer and any agents added explicitly
- `conversation rooms`: real-time rooms for message and presence notifications

Agent behavior:
- Assigned agents receive all conversation events via the conversation room.
- Agents may join conversation rooms for visibility without being the owner.
- Agents may add themselves or others as participants for collaboration.
- Only users with `AGENT`, `ADMIN`, or `SUPER_ADMIN` roles may be assigned.

## 4. AI participation

AI is not implemented in this milestone, but the workflow accounts for it.

AI participation modes:
- `assist`: AI suggests replies while the human agent remains owner.
- `hybrid`: AI auto-responds until a handoff rule triggers.
- `handoff`: AI flags a conversation for agent takeover.

Design principles:
- AI may be treated as an assistant to the assigned owner.
- AI should never replace assignment; instead it updates conversation metadata and state.
- The `state` can be used to represent AI-driven transitions (for example, `PENDING` while awaiting AI analysis).

## 5. Human handoff

Human handoff is the transition from AI-managed or unassigned conversation to an agent-owned conversation.

Rules:
- Handoff may happen automatically by rule or manually by AI/human action.
- Once handed off, `ownerId` is assigned and queue state becomes `ASSIGNED`.
- If no agent is available, the conversation stays in `NEW` or moves to a designated queue state such as `ON_HOLD`.

## 6. Queue states

Queue states support routing and operator workflows.

Definitions:
- `NEW`: conversation has not been touched by any agent.
- `ASSIGNED`: has a primary agent and is actively handled.
- `TRANSFERRED`: recently changed hands; useful for analytics and transfer notifications.
- `ESCALATED`: requires senior/technical handling, may still have an owner.
- `ON_HOLD`: waiting for more information or external dependencies.

Queue state should not replace `state`; it is orthogonal to the conversation lifecycle.

## 7. Ownership transitions

Ownership transitions are explicit changes to `ownerId`.

Transitions:
- `assign` (null -> agent)
- `transfer` (agent A -> agent B)
- `escalate` (agent -> supervisor/another agent)
- `unassign` (agent -> null)

Rules:
- Transfers must preserve history of assignment and update `queueState`.
- If a conversation is reassigned to the same owner, `queueState` remains `ASSIGNED`.
- If reassigned to a different owner, `queueState` becomes `TRANSFERRED`.
- Escalation may set `queueState` to `ESCALATED`.

## 8. Escalation rules

Escalation is a business rule, not a technical model.

Suggested rules:
- Escalate when a customer asks for supervisor or the issue classification matches escalation categories.
- Escalate when the current owner is unavailable for a configured period.
- Escalate when customer sentiment or priority metadata indicates urgency.

Implementation notes:
- Store escalation intent in metadata or in a future escalation table.
- Keep `ownerId` on the current agent while queue state is `ESCALATED` if the current owner remains responsible for coordination.
- When the issue is handed off to a higher-tier agent, treat it as a `transfer` plus `ESCALATED` queue state.

## 9. Transfer rules

Transfer is a special assignment transition.

Rules:
- Agent A requests transfer to agent B.
- System updates `ownerId` to B, `queueState` becomes `TRANSFERRED`, and `assignedAt` updates.
- The previous owner remains in participants unless explicitly removed.
- The receiving agent may optionally join the conversation room on transfer.
- Transfer should preserve existing message history and read receipts.

## 10. Reopen rules

A closed conversation can be reopened if:
- The customer sends a new message to the closed conversation.
- An agent explicitly reopens it.
- A follow-up task or SLA triggers a reopen.

Reopen behavior:
- `state` transitions from `CLOSED` to `OPEN`.
- `queueState` may transition to `NEW` or `ASSIGNED` based on whether an owner exists.
- `unreadCount` may be reset if the customer triggered the reopen, then incremented by new messages.
- Reopen should preserve previous participants and owner unless reassignment is required.

## 11. Schema and service implications

Current design updates:
- Added `queueState` and assignment metadata to `Conversation`.
- `assignOwner` now validates target agent roles and updates queue lifecycle.
- Conversation queries include owner/assignedBy for agent dashboards.

Future schema considerations:
- Add `ConversationPriority` if priority routing is needed.
- Add `ConversationTag` or `ConversationLabel` for workflow categorization.
- Add `ConversationHistory` or audit logs for assignment and transfer events.
- Add `QueueEntry` model for more advanced routing and SLA tracking.

## 12. Domain Event Bus

The system now publishes workflow transitions through a transport-independent domain event bus.

Responsibilities:
- Domain services publish events through `DomainEventBus`.
- Subscribers listen independently and react without being referenced by service logic.
- Socket.IO is one subscriber and remains the only transport layer consumer.
- Audit logging, analytics, notifications, and AI are implemented as independent subscriber modules.

Supported domain events:
- `conversation.assigned`
- `conversation.transferred`
- `conversation.escalated`
- `conversation.resolved`
- `conversation.closed`
- `conversation.reopened`
- `conversation.handoffToAI`
- `conversation.handoffToAgent`
- `conversation.ai.suggested`
- `conversation.ai.summarized`
- `conversation.ai.handoffRequested`

Subscriber responsibilities:
- Socket updates: broadcast workflow event data to conversation rooms.
- Audit logging: persist or log workflow transitions for traceability.
- Analytics: placeholder pipeline ingestion for metrics and reporting.
- Notifications: placeholder integration point for future alerting.
- AI: independent orchestration of AI capabilities through workflow service.

## 13. AI as First-Class Participant

AI operates as a system participant through the `DomainEventBus`:
- Subscribes to conversation workflow events
- Generates suggestions, summaries, and analysis
- Requests handoffs through the workflow service
- Publishes AI-specific events for subscriber consumption
- Never directly modifies conversation or message state

AI capabilities:
- Generate response suggestions for agents
- Summarize conversations for context
- Request agent handoff when issue exceeds AI scope
- Analyze sentiment and urgency
- Recommend resolution paths

All AI actions go through `ConversationWorkflowService`, which enforces permissions and publishes events.

## 14. Socket event contract implications

Current contract changes needed:
- `conversation:assign` should carry `conversationId`, `ownerId`, and `assignedBy` metadata.
- `conversation:transfer` should carry `conversationId`, `toAgentId`, `transferredBy`.
- `conversation:read` should carry `conversationId`, `readBy`, and `count`.
- `agent:join` remains valid for agent participation and room join.
- `conversation:ai:suggested` carries AI-generated suggestions.
- `conversation:ai:summarized` carries AI-generated conversation summary.
- `conversation:ai:handoff:requested` carries AI handoff request with reason.

These events support the workflow without exposing UI-specific behavior.

## 15. Stability goals for this milestone

This milestone freezes the business workflow and establishes AI as a first-class participant. No user-facing UI changes, dashboards, or live analytics features.

Deliverables:
- Stable conversation and assignment lifecycle design
- Production-grade schema support
- Clear lifecycle rules and transition states
- AI orchestration framework ready for LLM integration
- Documentation for developers and future feature implementation
