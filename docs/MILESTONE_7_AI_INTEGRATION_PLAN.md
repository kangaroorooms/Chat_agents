# Milestone 7: AI Integration - Development Plan

## Overview
Implement real LLM integration with streaming responses, conversation memory, and context management.

## Requirements
✅ Streaming responses
✅ Conversation memory  
✅ Context management
✅ Confidence scoring
✅ Human handoff
✅ Conversation summaries
✅ AI suggestions

## Architecture

### Module Structure
```
src/modules/ai/
  ├── ai.orchestration.ts      (✅ exists - event subscription)
  ├── ai.service.ts             (new - LLM operations)
  ├── ai.types.ts               (new - shared types)
  ├── ai.memory.ts              (new - conversation memory)
  └── ai.routes.ts              (new - API endpoints)
```

### Key Components

#### 1. AI Service (`ai.service.ts`)
Responsibilities:
- OpenAI client initialization
- Message generation with streaming
- Context window management
- Confidence scoring
- Error handling and timeouts

Methods:
- `generateResponse(conversationId, messageHistory, userId)` → AsyncIterator<string>
- `loadConversationContext(conversationId)` → ConversationContext
- `calculateConfidenceScore(response)` → number
- `summarizeConversation(messages)` → string
- `generateSuggestions(lastMessage, history)` → string[]
- `shouldHandoff(response, confidence)` → boolean

#### 2. AI Memory (`ai.memory.ts`)
Responsibilities:
- Load conversation history
- Maintain context window
- Summarize long conversations
- Build system prompts

Methods:
- `buildSystemPrompt()` → string
- `loadConversationHistory(conversationId)` → Message[]
- `buildContextWindow(history, maxTokens)` → Message[]
- `summarizeHistory(messages)` → string

#### 3. AI Types (`ai.types.ts`)
Types:
- `AIConfig` - OpenAI settings, max tokens, temperature, etc.
- `ConversationContext` - conversation metadata for context
- `AIResponse` - streaming response with confidence
- `StreamingMessage` - message chunk with metadata

### Configuration

Add to `.env`:
```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo
OPENAI_MAX_TOKENS=6000
OPENAI_TEMPERATURE=0.7
AI_CONTEXT_WINDOW_TOKENS=4000
AI_CONFIDENCE_THRESHOLD=0.7
AI_HANDOFF_ON_LOW_CONFIDENCE=true
AI_HANDOFF_ON_UNSUPPORTED_TOPIC=true
```

### Data Flow

```
Customer Message
  → AI Orchestration hears event
  → Loads conversation context
  → Calls AI Service
  → Streams response tokens
  → AI Service scores confidence
  → Decides: handoff or continue
  → Creates Message from response
  → Publishes message event
  → Socket broadcasts to client
```

### Integration with Existing Modules

1. **ConversationWorkflow**
   - AI calls existing workflow methods
   - No changes to workflow service
   - Uses existing permission model

2. **MessageService**
   - AI creates messages via Service
   - Existing validation applies
   - Socket subscribers broadcast

3. **DomainEventBus**
   - AI subscribes to existing events
   - Publishes existing AI events
   - No new event types needed

4. **Socket.IO**
   - Broadcasts streaming tokens
   - Broadcasts generated messages
   - Uses existing event mappings

## Implementation Phases

### Phase 1: Foundation
- [ ] Add OpenAI dependency
- [ ] Create AI service skeleton
- [ ] Implement OpenAI client initialization
- [ ] Create AI configuration module
- [ ] Build and verify no errors

### Phase 2: Basic Generation
- [ ] Implement `generateResponse()` with streaming
- [ ] Add streaming to AI orchestration
- [ ] Create test endpoint to verify generation
- [ ] Handle OpenAI errors and timeouts
- [ ] Build and verify

### Phase 3: Context & Memory
- [ ] Implement `loadConversationContext()`
- [ ] Build conversation history loading
- [ ] Implement context window management
- [ ] Add conversation summarization for long threads
- [ ] Test context loading

### Phase 4: Confidence & Handoff
- [ ] Add confidence scoring
- [ ] Implement handoff logic
- [ ] Add confidence-based routing
- [ ] Test handoff triggering
- [ ] Build and verify

### Phase 5: Suggestions
- [ ] Add `generateSuggestions()`
- [ ] Integrate with orchestration
- [ ] Store suggestions in metadata
- [ ] Test suggestion generation

### Phase 6: Integration & Testing
- [ ] End-to-end conversation flow
- [ ] Streaming response verification
- [ ] Handoff flow testing
- [ ] Memory and context testing
- [ ] Performance optimization
- [ ] Documentation

## Testing Strategy

### Unit Tests
- Confidence scoring logic
- Context window truncation
- Token counting

### Integration Tests
- OpenAI API calling (with mocks)
- Conversation context loading
- Message creation from AI response

### Manual Tests
- Chat with AI and verify streaming
- Trigger handoff with low confidence
- Verify conversation history is preserved
- Test long conversations with summarization

## Error Handling

- OpenAI API errors → handoff to agent
- Timeout (>30s) → return partial response or handoff
- Token limit exceeded → summarize and retry
- Invalid context → use minimal context
- Rate limits → queue for retry

## Performance Considerations

- Cache conversation summaries (24h)
- Limit context window (prevent large token usage)
- Stream tokens to client immediately (don't buffer)
- Implement request timeouts
- Monitor token usage and costs

## Security Considerations

- Never log full API keys
- Validate AI responses before storing
- Rate limit AI generation per user
- Sanitize user input before sending to OpenAI
- Audit all AI operations

## Documentation

- Update [AI_ORCHESTRATION.md](AI_ORCHESTRATION.md) with LLM details
- Document OpenAI configuration
- Add examples of streaming responses
- Document error handling
- Add security guidelines

## Next Steps After Completion

- Milestone 8: Agent Dashboard
- Implement agent assignments and queue
- Real-time agent activity
- Agent performance metrics

## Dependencies to Install

```bash
npm install openai
```

Optional:
- `tsx-streaming` for better streaming support
- `tokenizers` for accurate token counting

## Files to Modify

- `package.json` - add openai dependency
- `src/modules/ai/ai.orchestration.ts` - integrate with service
- `docs/AI_ORCHESTRATION.md` - update with LLM details
- `.env.example` - add AI configuration

## Exit Criteria

- [ ] Build passes (`npm run build` → exit 0)
- [ ] No TypeScript errors
- [ ] Streaming responses work end-to-end
- [ ] Handoff logic functional
- [ ] AI service errors don't crash app
- [ ] Context window management working
- [ ] Documentation complete
- [ ] No temporary implementations
