# AI Conversation Orchestration

This document describes how AI operates as a first-class participant in the customer support platform.

## 1. Architecture Overview

AI is implemented as an independent orchestrator that:
- Receives conversation workflow events through the `DomainEventBus`
- Generates AI-specific events (suggestions, summaries, handoff requests)
- Publishes operations through the `ConversationWorkflowService`
- Never directly modifies `Conversation` or `Message` entities
- Remains independent of Socket.IO and HTTP layers
- Uses OpenAI API for LLM-powered generation

## 2. AI System Participant

The AI is represented as a system user with ID `ai-system`. This allows:
- AI to call workflow operations with proper authorization
- Audit trails to distinguish AI actions from human actions
- Integration with existing conversation participant logic

## 3. AI Workflow Participation

The AI system can participate in conversations through these operations:

### Add Summary
```typescript
await conversationWorkflowService.addAISummary(
  AI_SYSTEM_USER_ID,
  conversationId,
  'Conversation summary text'
)
```
- Publishes `conversation.ai.summarized` event
- Stores summary in conversation metadata
- Subscribers receive event for broadcasting

### Add Suggestions
```typescript
await conversationWorkflowService.addAISuggestions(
  AI_SYSTEM_USER_ID,
  conversationId,
  ['Suggested reply 1', 'Suggested reply 2']
)
```
- Publishes `conversation.ai.suggested` event
- Stores suggestions in conversation metadata
- Allows agents to adopt or dismiss suggestions

### Request Handoff
```typescript
await conversationWorkflowService.requestAIOperation(
  AI_SYSTEM_USER_ID,
  conversationId,
  'Reason for handoff',
  targetAgentId
)
```
- Publishes `conversation.ai.handoffRequested` event
- Records handoff reason in metadata
- Agents can act on handoff requests through transfer or escalate

## 4. Event-Driven AI Orchestration

### Supported Events

AI subscribes to and reacts to:
- `conversation.assigned` - AI can generate initial suggestions
- `conversation.transferred` - AI can update context and suggestions
- `conversation.escalated` - AI can provide escalation summary
- `conversation.resolved` - AI can confirm resolution
- `conversation.closed` - AI can provide final summary
- `conversation.reopened` - AI can re-engage with conversation
- `conversation.handoffToAI` - AI receives explicit handoff
- `conversation.handoffToAgent` - AI yields to human agent

### Emitted Events

AI generates:
- `conversation.ai.suggested` - AI has suggestions for agent
- `conversation.ai.summarized` - AI has completed a summary
- `conversation.ai.handoffRequested` - AI is requesting human takeover

## 5. AI Orchestrator Module

Located in `src/modules/ai/ai.orchestration.ts`

Responsibilities:
- Listen to conversation workflow events via `DomainEventBus`
- Analyze conversation state and history
- Generate suggestions, summaries, and analysis
- Determine when human handoff is required
- Publish AI-specific events through workflow service
- Store AI insights in conversation metadata

## 6. Message and Conversation Immutability

AI cannot:
- Create or modify messages directly
- Change conversation state or owner directly
- Delete or archive conversations

AI can only:
- Read conversation and message history
- Publish suggestions and summaries as metadata
- Request state transitions through workflow service
- Request agent handoffs

## 7. Socket.IO Integration

AI events are broadcast to conversation rooms by the socket subscriber:
- `conversation:ai:suggested` - Contains AI suggestions
- `conversation:ai:summarized` - Contains AI summary
- `conversation:ai:handoff:requested` - Contains handoff reason

These events allow real-time UI updates without AI knowledge of transport layer.

## 8. Metadata Storage

AI insights are persisted in the `Conversation.metadata` field:

```json
{
  "aiSummary": "Conversation resolved with customer satisfaction",
  "aiSummaryAt": "2026-07-17T10:30:00Z",
  "aiSuggestions": ["Suggested action 1", "Suggested action 2"],
  "aiSuggestionsAt": "2026-07-17T10:25:00Z",
  "aiHandoffRequest": {
    "reason": "Issue requires supervisor approval",
    "requestedAt": "2026-07-17T10:28:00Z",
    "targetAgentId": "supervisor-uuid"
  },
  "workflow": {
    "handoff": "AI",
    "handoffAt": "2026-07-17T10:20:00Z"
  }
}
```

## 9. Authorization Rules

- AI system user has implicit permission to:
  - Add summaries and suggestions to any conversation
  - Request handoffs for any conversation
  - Read any conversation it's subscribed to via events
- AI cannot:
  - Directly modify conversation state or assignment
  - Create or delete conversations
  - Bypass workflow service transitions

## 10. Future AI Capabilities

Placeholders for future implementation:
- Real LLM integration for intelligent suggestions
- Sentiment analysis and emotion detection
- Conversation classification and routing
- Context-aware response generation
- Escalation pattern recognition
- SLA impact analysis
- Customer satisfaction prediction

## 11. Design Principles

### Separation of Concerns
- AI logic is isolated in `src/modules/ai/`
- Workflow service owns all state changes
- Event bus decouples AI from other systems

### Observability
- All AI actions are published as domain events
- Audit subscribers log AI decisions
- Socket subscribers broadcast AI insights

### Extensibility
- AI event types can be extended without workflow changes
- New AI operations can be added as workflow methods
- Multiple AI implementations can subscribe to same events

### Reliability
- AI failures don't block conversation workflows
- Timeouts on AI operations prevent blocking
- Event bus ensures at-least-once delivery semantics

## 12. Development Workflow

When adding new AI capabilities:

1. Define new domain event in `src/modules/events/domain-events.ts`
2. Add workflow method in `ConversationWorkflowService` if state changes needed
3. Update `src/modules/ai/ai.orchestration.ts` to handle new events
4. Add socket event mapping in `eventRegistry.ts` for real-time broadcast
5. Update AI event handling in socket subscriber
6. Document new capability in this file

All changes go through the workflow service, never direct database access.

## 13. LLM Integration (OpenAI)

### Configuration

AI uses the OpenAI API for response generation. Configure via environment variables:

```env
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-4-turbo
OPENAI_MAX_TOKENS=6000
OPENAI_TEMPERATURE=0.7
AI_CONTEXT_WINDOW_TOKENS=4000
AI_CONFIDENCE_THRESHOLD=0.7
AI_HANDOFF_ON_LOW_CONFIDENCE=true
AI_STREAM_TIMEOUT=60000
```

### Response Generation

The AI Service (`src/modules/ai/ai.service.ts`) provides:

- **Streaming responses**: `generateResponseStream(conversationId, userMessage)`
  - Streams response tokens to client in real-time
  - Automatically calculates confidence score
  - Determines handoff eligibility
  - Creates message after streaming completes

- **Suggestions for agents**: `generateSuggestions(conversationId, lastMessage)`
  - Generates 3 response options for agents to choose from
  - Uses reduced context window for faster generation
  - Stores suggestions in conversation metadata

- **Conversation summarization**: `summarizeConversation(messages)`
  - Produces 2-3 sentence summary of conversation
  - Highlights key issues and resolutions
  - Used for agent handoff context

### Confidence Scoring

AI generates a confidence score (0-1) for each response based on:
- Presence of uncertainty qualifiers ("unsure", "may", "might")
- Question marks in response
- Response length (longer = more confident)
- Explicit negation of knowledge

Scores below threshold trigger automatic human handoff.

### Context Management

AI automatically:
- Loads last 100 messages from conversation history
- Truncates to fit within token budget (default: 4000 tokens)
- Builds system prompt with customer context
- Formats message history for API compatibility

### Error Handling

- **OpenAI API errors** → Log error, optionally trigger handoff
- **Timeout (>30s)** → Return partial response or request handoff
- **Token limit exceeded** → Summarize and retry with fewer messages
- **Invalid context** → Use minimal context fallback

## 14. HTTP API Endpoints

### POST /api/ai/chat/:conversationId

Stream AI response for a user message.

**Request:**
```bash
curl -X POST http://localhost:6000/api/ai/chat/conv-123 \
  -H "Content-Type: application/json" \
  -d '{"message": "I need help with my account"}'
```

**Response (Server-Sent Events):**
```
data: {"content": "I'd be happy to help "}
data: {"content": "you with your account"}
data: [DONE]
```

**Flow:**
1. Create user message in database
2. Stream AI response chunks via Server-Sent Events
3. Create AI message from full response
4. Check confidence and trigger handoff if needed
5. Publish message events for subscribers

### POST /api/ai/suggestions/:conversationId

Generate response suggestions for agents.

**Request:**
```bash
curl -X POST http://localhost:6000/api/ai/suggestions/conv-123 \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I reset my password?"}'
```

**Response:**
```json
{
  "suggestions": [
    "I'll help you reset your password...",
    "Let me send you a reset link...",
    "We can reset it in a few steps..."
  ],
  "confidence": 0.85,
  "generatedAt": "2026-07-17T10:30:00Z"
}
```

### POST /api/ai/summarize/:conversationId

Summarize the entire conversation.

**Request:**
```bash
curl -X POST http://localhost:6000/api/ai/summarize/conv-123 \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "summary": "Customer requested help resetting password. Account locked due to multiple failed attempts. Advised to wait 24 hours before retry.",
  "keyPoints": [
    "Password reset requested",
    "Account temporarily locked",
    "24-hour wait required"
  ],
  "generatedAt": "2026-07-17T10:30:00Z"
}
```

## 15. Orchestration Integration

The AI Orchestration module (`src/modules/ai/ai.orchestration.ts`) integrates with the LLM service:

1. **Event Reception**: Listens to conversation workflow events
2. **Context Loading**: Loads conversation history via `ai.memory`
3. **AI Service Call**: Calls appropriate LLM operation
4. **Workflow Publication**: Publishes results through workflow service
5. **Error Recovery**: Gracefully handles AI service failures

Example flow for assignment:
```
1. conversation.assigned event
   ↓
2. AI orchestration receives event
   ↓
3. Load last message from conversation
   ↓
4. Call aiService.generateSuggestions()
   ↓
5. Call conversationWorkflowService.addAISuggestions()
   ↓
6. Workflow publishes conversation.ai.suggested
   ↓
7. Socket subscriber broadcasts to UI
```

