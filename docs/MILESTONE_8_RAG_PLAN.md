# Milestone 8: Knowledge Base & Retrieval (RAG) - Architecture Plan

## Overview

Implement a retrieval-augmented generation (RAG) layer that:
- Maintains company knowledge bases independent of conversations
- Provides semantic search capabilities via embeddings
- Enriches AI responses with relevant documents
- Supports replaceable embedding providers
- Keeps workflow and orchestration layers independent

## Architecture Design

### Data Model (Prisma Schema)

```prisma
model KnowledgeDocument {
  id            String   @id @default(uuid())
  companyId     String
  company       Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  title         String
  content       String   @db.Text
  metadata      Json?    // tags, category, source_url, version
  
  chunks        KnowledgeChunk[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([companyId])
  @@fulltext([title, content])  // For full-text search
}

model KnowledgeChunk {
  id            String   @id @default(uuid())
  documentId    String
  document      KnowledgeDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  sequence      Int       // Position in document
  content       String    @db.Text
  embedding     String?   // Serialized vector (JSON array)
  embeddingModel String?  // e.g., "text-embedding-3-small"
  
  metadata      Json?    // chunk-specific metadata
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([documentId, sequence])
  @@index([documentId])
}

model Company {
  ...existing fields...
  knowledgeDocuments KnowledgeDocument[]
}
```

### Service Architecture

```
src/modules/knowledge/
├── knowledge.types.ts           (Type definitions)
├── knowledge.config.ts          (Configuration)
├── embeddings/
│   ├── embedding.provider.ts    (Abstract interface)
│   ├── openai.embedding.ts      (OpenAI implementation)
│   └── mock.embedding.ts        (Mock for testing)
├── retriever/
│   ├── retriever.service.ts     (Search & ranking)
│   └── retriever.types.ts
├── indexing/
│   ├── indexing.service.ts      (Document chunking & embedding)
│   └── chunking.ts              (Text chunking strategy)
├── prompt/
│   ├── prompt-builder.ts        (Context augmentation)
│   └── prompt.types.ts
├── knowledge.service.ts         (Public API)
└── index.ts
```

### Key Abstractions

#### 1. EmbeddingProvider Interface
```typescript
interface EmbeddingProvider {
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
  getDimensions(): number
  getModelName(): string
}
```

#### 2. Retriever Service
```typescript
interface RetrievalQuery {
  query: string
  conversationId?: string
  topK?: number
  threshold?: number
}

interface RetrievedDocument {
  documentId: string
  chunkId: string
  content: string
  score: number
  metadata?: any
}

interface RetrieverService {
  retrieve(query: RetrievalQuery): Promise<RetrievedDocument[]>
  indexDocument(document: KnowledgeDocument): Promise<void>
  deleteDocument(documentId: string): Promise<void>
}
```

#### 3. PromptBuilder
```typescript
interface PromptContext {
  conversation: Message[]
  retrievedDocuments: RetrievedDocument[]
  customerContext?: any
}

interface PromptBuilder {
  buildSystemPrompt(context: PromptContext): string
  buildUserPrompt(message: string, context: PromptContext): string
}
```

## Implementation Strategy

### Phase 1: Schema & Core Services (Current)
- [ ] Update Prisma schema
- [ ] Create embedding provider abstraction
- [ ] Implement OpenAI embeddings
- [ ] Create retriever service (vector + semantic search)
- [ ] Build indexing service
- [ ] Create prompt builder

### Phase 2: Integration (Future)
- [ ] Update AI service to use retriever
- [ ] Add documents API endpoint
- [ ] Update AI orchestration (no changes to logic)
- [ ] Add retrieval metrics

### Phase 3: Enhancement (Future)
- [ ] Implement reranking
- [ ] Add query expansion
- [ ] Support hybrid search (full-text + semantic)
- [ ] Add document versioning

## Data Flow

```
Customer Message
  ↓
AI Service receives message
  ↓
AI Service calls Retriever
  ↓
Retriever queries knowledge base
  ↓
PromptBuilder augments system prompt
  ↓
LLM receives conversation + knowledge context
  ↓
LLM generates response with citations
```

## Key Features

### 1. Document Chunking
- Intelligent splitting (sentences, paragraphs)
- Overlap between chunks (default 10%)
- Configurable chunk size (default 512 tokens)
- Preserve context across chunks

### 2. Semantic Search
- Vector similarity search using embeddings
- Configurable similarity threshold
- Ranking by relevance score
- Optional full-text fallback

### 3. Embedding Management
- Lazy embedding generation
- Batch embedding operations
- Provider abstraction (OpenAI, Hugging Face, local)
- Model name tracking for versioning

### 4. Knowledge Indexing
- Incremental indexing
- Batch document import
- Document versioning via metadata
- Efficient storage with compression

## Integration Points

### AI Service Integration
```typescript
// In ai.service.ts generateResponseStream()
const context = await buildConversationContext(conversationId)
const retrievedDocs = await retrieverService.retrieve({
  query: userMessage,
  conversationId,
  topK: 5
})
const systemPrompt = promptBuilder.buildSystemPrompt({
  conversation: context.messages,
  retrievedDocuments: retrievedDocs
})
```

### No Changes Required
- Workflow service remains independent
- AI orchestration logic unchanged
- Socket.IO subscribers unaffected
- Domain events unaffected

## Configuration

```env
# Embedding Provider
EMBEDDING_PROVIDER=openai          # or: mock, huggingface
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536

# Retrieval
RETRIEVAL_TOP_K=5
RETRIEVAL_SIMILARITY_THRESHOLD=0.5
RETRIEVAL_CHUNK_SIZE=512
RETRIEVAL_CHUNK_OVERLAP=0.1

# Knowledge Indexing
KNOWLEDGE_BATCH_SIZE=10
KNOWLEDGE_AUTO_INDEX=true
```

## API Endpoints (Phase 2)

```
POST   /api/knowledge/documents          - Upload document
GET    /api/knowledge/documents          - List documents
GET    /api/knowledge/documents/:id      - Get document
DELETE /api/knowledge/documents/:id      - Delete document
POST   /api/knowledge/documents/:id/index - Trigger re-indexing
GET    /api/knowledge/search             - Search knowledge base
```

## Testing Strategy

### Unit Tests
- Embedding provider implementations
- Chunking algorithms
- Similarity scoring
- Prompt building

### Integration Tests
- End-to-end retrieval flow
- Indexing pipeline
- Provider integration
- Search accuracy

### Manual Tests
- Document upload and indexing
- Query with relevant documents
- Compare AI responses with/without retrieval

## Files to Create

Phase 1 (Current):
- `src/modules/knowledge/knowledge.types.ts`
- `src/modules/knowledge/knowledge.config.ts`
- `src/modules/knowledge/embeddings/embedding.provider.ts`
- `src/modules/knowledge/embeddings/openai.embedding.ts`
- `src/modules/knowledge/embeddings/mock.embedding.ts`
- `src/modules/knowledge/retriever/retriever.service.ts`
- `src/modules/knowledge/retriever/retriever.types.ts`
- `src/modules/knowledge/indexing/indexing.service.ts`
- `src/modules/knowledge/indexing/chunking.ts`
- `src/modules/knowledge/prompt/prompt-builder.ts`
- `src/modules/knowledge/prompt/prompt.types.ts`
- `src/modules/knowledge/knowledge.service.ts`
- `src/modules/knowledge/index.ts`
- `prisma/migrations/[timestamp]_add_knowledge_base/migration.sql`
- `docs/KNOWLEDGE_BASE_RAG.md`

## Success Criteria

✅ Schema: KnowledgeDocument and KnowledgeChunk created
✅ Abstraction: EmbeddingProvider interface fully implemented
✅ Search: Semantic retrieval working with vector similarity
✅ Indexing: Automatic document chunking and embedding
✅ Prompt: Context-aware prompt building
✅ Build: No TypeScript errors
✅ Documentation: Architecture guide complete
✅ Integration: AI service ready for retriever (no breaking changes)
✅ Independence: Workflow and orchestration unaffected
