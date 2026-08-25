# Knowledge Base & RAG (Retrieval-Augmented Generation) Architecture

## Overview

The Knowledge Base & RAG system provides semantic search and context-aware information retrieval for AI-powered conversations. It enables the chatbot to augment responses with relevant, retrieved knowledge without modifying the core AI orchestration layer.

**Key Design Principle**: The retrieval layer is completely independent and replaceable, allowing for different embedding providers, chunking strategies, and search algorithms without affecting the AI service.

## Architecture Layers

### 1. **Data Layer** (Prisma Schema)
```prisma
model Company
- id: String (Primary Key)
- name: String
- metadata: Json
- relationships: KnowledgeDocument[]

model KnowledgeDocument
- id: String (Primary Key)
- companyId: String (Foreign Key)
- title: String
- content: String (raw document text)
- metadata: Json
- chunks: KnowledgeChunk[]
- indexes: [companyId, createdAt]

model KnowledgeChunk
- id: String (Primary Key)
- documentId: String (Foreign Key)
- sequence: Int (chunk order within document)
- content: String (chunk text)
- embedding: Json (1536-dim vector for text-embedding-3-small)
- embeddingModel: String (model used to generate embedding)
- metadata: Json (chunk-specific metadata)
- unique constraint: (documentId, sequence)
```

**Design Rationale**:
- Company-based isolation ensures multi-tenant support
- Separate Chunk records enable efficient semantic search (vs. searching whole documents)
- Embedding stored as JSON for flexibility (PostgreSQL handles numeric arrays efficiently)
- Sequence field tracks chunk order for context reconstruction

### 2. **Embedding Abstraction**
```typescript
interface EmbeddingProvider
├── embed(text: string): Promise<number[]>
├── embedBatch(texts: string[]): Promise<number[][]>
├── getDimensions(): number
└── getModelName(): string

Implementations:
├── OpenAIEmbeddingProvider (text-embedding-3-small)
└── MockEmbeddingProvider (deterministic for testing)
```

**Factory Pattern**: `createEmbeddingProvider(type)` returns the appropriate provider instance based on configuration.

**Key Features**:
- Batch embedding for efficiency (10-100 chunks per batch)
- Deterministic mock provider uses seeded RNG for reproducible testing
- OpenAI provider integrates with existing OpenAI SDK instance

### 3. **Text Chunking Strategies**
```typescript
smartChunk(text, chunkSize, overlap)
├── chunkBySentences() - Preserves sentence boundaries
├── chunkByParagraphs() - Splits by paragraph markers
├── chunkByTokens() - Fixed token budget (≈4 chars/token)
└── (auto-selection based on text structure)

Configuration:
- chunkSize: 1000 (default, in chars)
- chunkOverlap: 200 (chars between chunks)
- estimateTokens(): ~4 chars ≈ 1 token
```

**Rationale**: 
- Sentence/paragraph boundaries preserve semantic coherence
- Token-based chunking ensures LLM compatibility
- Overlap enables context preservation across chunk boundaries

### 4. **Retrieval Service**
```typescript
RetrieverService
├── retrieve(query, companyId, topK=5, threshold=0.5)
│   └── Returns: RetrievedDocument[] (sorted by relevance score)
├── indexDocument(documentId) - Updates embeddings
└── deleteDocument(documentId) - Removes from knowledge base

Algorithm:
1. Generate embedding for user query
2. Fetch all chunks for company from database
3. Calculate cosine similarity: cos(θ) = (a·b) / (||a|| ||b||)
4. Filter results: score >= threshold
5. Sort by descending score
6. Return top-K results
```

**Performance Optimizations**:
- Batch embedding generation
- Database indexing on `companyId` and `createdAt`
- Configurable similarity threshold to reduce noise
- Top-K limiting to control response size

**Search Metrics**:
- Similarity threshold: 0.5 (cosine similarity, 0-1 scale)
- Default top-K: 5 results
- Configurable per query

### 5. **Indexing Service**
```typescript
IndexingService
├── indexDocument(input)
│   ├── Create KnowledgeDocument record
│   ├── Chunk text using smart strategy
│   ├── Create KnowledgeChunk records
│   ├── Generate embeddings in batches
│   └── Update chunks with embeddings
├── reindexDocument(documentId)
│   └── Delete old chunks and re-index
└── batchIndexDocuments(docIds)
    └── Process multiple documents
```

**Workflow**:
1. Document is added with `POST /api/knowledge/documents`
2. Content is chunked according to strategy
3. Embedding provider generates embeddings (batched)
4. Embeddings stored in KnowledgeChunk.embedding JSON field
5. Document ready for semantic search

**Batch Processing**:
- Default batch size: 10 chunks per embedding request
- Reduces OpenAI API calls and cost
- Parallelizable for production systems

### 6. **Prompt Builder** (Context Augmentation)
```typescript
PromptBuilder
├── buildSystemPrompt(context)
│   └── Returns: Augmented system prompt with knowledge context
├── buildUserPromptWithContext(message, context)
│   └── Wraps user message with relevant document snippets
└── formatRetrievedDocuments(docs)
    └── Formats retrieved chunks with relevance scores

Context Structure:
{
  conversation: [{role, content}],
  retrievedDocuments: [RetrievedDocument],
  customerContext: {customerId, agentId, ...}
}
```

**System Prompt Template**:
```
You are a helpful and professional customer support agent.

Conversation Context:
- Message Count: N
- Customer Context: {...}

Knowledge Base Context:
[Document 1 - Relevance: 95%]
...content...
---
[Document 2 - Relevance: 87%]
...content...
---

Guidelines:
1. Be empathetic and professional
2. Provide clear and concise answers
3. Reference knowledge base information when relevant
...
```

**Design**: Knowledge context is injected into the system prompt, not user prompt, to:
- Give LLM explicit instruction to use retrieved information
- Maintain conversation history in user messages
- Allow LLM to weight guidance appropriately

### 7. **AI Service Integration**
```typescript
AIService.generateResponseStream(conversationId, userMessage, companyId)

Flow:
1. Build conversation context (history)
2. Retrieve relevant documents (if companyId provided)
   └── Query: user message
   └── Results: top-5 with similarity ≥ 0.5
3. Build augmented system prompt
   └── Inject retrieved documents
   └── Add customer context
4. Call OpenAI with augmented system prompt
5. Stream response to client
6. Return with token usage metrics

Graceful Degradation:
- If retrieval fails, continues without knowledge base
- If no companyId provided, skips retrieval entirely
- Works with existing AI orchestration (no changes needed)
```

## API Endpoints

### Document Management

#### Add Document
```http
POST /api/knowledge/documents
Content-Type: application/json

{
  "companyId": "company-123",
  "title": "Billing FAQ",
  "content": "Frequently asked questions about billing...",
  "metadata": {"category": "faq", "version": "1.0"}
}

Response:
{
  "success": true,
  "data": {
    "documentId": "doc-456",
    "chunksCreated": 12,
    "tokensProcessed": 4532,
    "embeddingsGenerated": 12
  }
}
```

#### List Documents
```http
GET /api/knowledge/companies/:companyId/documents?page=1&limit=10

Response:
{
  "success": true,
  "data": [
    {
      "id": "doc-456",
      "title": "Billing FAQ",
      "createdAt": "2024-06-17T10:30:00Z",
      "_count": {"chunks": 12}
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "pages": 5
  }
}
```

#### Get Document
```http
GET /api/knowledge/documents/:id

Response:
{
  "success": true,
  "data": {
    "id": "doc-456",
    "companyId": "company-123",
    "title": "Billing FAQ",
    "content": "...",
    "metadata": {...},
    "chunks": [
      {
        "id": "chunk-1",
        "sequence": 0,
        "content": "...",
        "embeddingModel": "text-embedding-3-small"
      }
    ]
  }
}
```

#### Delete Document
```http
DELETE /api/knowledge/documents/:id

Response:
{
  "success": true,
  "message": "Document deleted"
}
```

#### Reindex Document
```http
POST /api/knowledge/documents/:id/reindex

Response:
{
  "success": true,
  "data": {
    "documentId": "doc-456",
    "chunksCreated": 12,
    "tokensProcessed": 4532,
    "embeddingsGenerated": 12
  }
}
```

#### Search Knowledge Base
```http
POST /api/knowledge/search
Content-Type: application/json

{
  "query": "How do I change my billing address?",
  "companyId": "company-123",
  "topK": 5,
  "threshold": 0.5
}

Response:
{
  "success": true,
  "data": [
    {
      "documentId": "doc-456",
      "chunkId": "chunk-78",
      "chunkSequence": 5,
      "content": "To change your billing address...",
      "score": 0.92,
      "metadata": {}
    }
  ]
}
```

## Configuration

### Environment Variables

```bash
# Embedding Provider
EMBEDDING_PROVIDER=openai          # 'openai' or 'mock'
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536

# Retrieval Parameters
RETRIEVAL_TOP_K=5                  # Number of results to return
RETRIEVAL_SIMILARITY_THRESHOLD=0.5 # Minimum cosine similarity (0-1)
RETRIEVAL_CHUNK_SIZE=1000          # Characters per chunk
RETRIEVAL_CHUNK_OVERLAP=200        # Overlap between chunks

# Indexing
KNOWLEDGE_BATCH_SIZE=10            # Chunks per embedding request
KNOWLEDGE_AUTO_INDEX=true          # Auto-index on document add
```

### Runtime Configuration

```typescript
interface IndexingConfig {
  chunkSize: number              // 1000
  chunkOverlap: number           // 200
  embeddingProvider: string      // 'openai' | 'mock'
  embeddingModel: string         // 'text-embedding-3-small'
  batchSize: number              // 10
}

interface RetrievalConfig {
  retrievalTopK: number          // 5
  retrievalSimilarityThreshold: number // 0.5
  embeddingModel: string
  dimensions: number
}
```

## Module Structure

```
src/modules/knowledge/
├── index.ts                      # Public exports
├── knowledge.types.ts            # Type definitions
├── knowledge.config.ts           # Configuration loading
├── knowledge.service.ts          # Main service facade
├── knowledge.routes.ts           # HTTP endpoints
├── embeddings/
│   ├── openai.embedding.ts      # OpenAI provider
│   └── mock.embedding.ts        # Mock provider
├── indexing/
│   ├── chunking.ts              # Text chunking strategies
│   └── indexing.service.ts      # Document indexing
├── retriever/
│   └── retriever.service.ts     # Semantic search
└── prompt/
    └── prompt-builder.ts        # Prompt augmentation
```

## Integration Points

### AI Service Integration
```typescript
// In ai.service.ts generateResponseStream()
const retriever = getRetrieverService()
const retrievedDocuments = await retriever.retrieve({
  query: userMessage,
  companyId,
  topK: 5,
  threshold: 0.5,
})

const promptBuilder = getPromptBuilder()
const augmentedSystemPrompt = promptBuilder.buildSystemPrompt({
  conversation: messages.map(...),
  retrievedDocuments,
  customerContext: {...},
})

// System prompt is injected into OpenAI call
```

### Usage in Conversation
```typescript
// User initiates chat
// CompanyId is passed through context
const response = await aiService.generateResponseStream(
  conversationId,
  userMessage,
  companyId  // Enables knowledge base retrieval
)

// Retriever automatically fetches relevant documents
// Prompt builder augments system prompt
// LLM generates response using knowledge + history
```

## Performance Considerations

### Latency
- Embedding generation: ~100ms for 10 chunks (batch)
- Database query: ~5-10ms (with indexes)
- Cosine similarity calculation: <1ms for 5 results
- **Total retrieval**: ~115ms added to response time

### Scalability
- Supports unlimited documents per company
- Batch processing reduces API costs
- Database indexes on `companyId` and `createdAt`
- Configurable top-K limits response size

### Cost Optimization
- Batch embedding: 10 chunks = 1 API call (vs. 10 calls)
- Mock provider for development/testing (free)
- Configurable similarity threshold reduces irrelevant results

## Testing Strategy

### Unit Tests
- Embedding providers (mock deterministic results)
- Text chunking strategies (boundary preservation)
- Cosine similarity calculations
- Prompt building with various contexts

### Integration Tests
- Document indexing: create → chunk → embed → store
- Retrieval: query → search → rank → return
- AI integration: conversation + knowledge context

### End-to-End Tests
- Add knowledge document
- Generate conversation with retrieval
- Verify response uses retrieved context
- Delete document and verify removal

### Manual Testing
```bash
# Add a document
curl -X POST http://localhost:6000/api/knowledge/documents \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "test-company",
    "title": "Test Doc",
    "content": "Sample content..."
  }'

# Search knowledge base
curl -X POST http://localhost:6000/api/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "relevant question",
    "companyId": "test-company"
  }'
```

## Future Enhancements

### Phase 2 (Planned)
1. **Multiple Embedding Providers**
   - Ollama (local, on-premise)
   - Cohere API (alternative commercial)
   - HuggingFace models

2. **Advanced Retrieval**
   - Hybrid search (semantic + keyword BM25)
   - Multi-stage ranking (dense + sparse)
   - Query expansion and reformulation

3. **Vector Database**
   - pgvector for PostgreSQL
   - Pinecone or Weaviate integration
   - HNSW indexing for 100M+ vectors

4. **Knowledge Management**
   - Automatic document update detection
   - Versioning and rollback
   - Citation and source tracking

### Performance Improvements
- Redis caching for embedding results
- Lazy embedding generation (on-demand vs. batch)
- Approximate nearest neighbor search (HNSW)

## Security & Privacy

### Current Implementation
- Company-based isolation (all queries filtered by companyId)
- No PII extraction or storage (documents stored as-is)
- Embeddings stored alongside documents (no external vector DB)

### Recommendations
- Encryption at rest for sensitive documents
- Access control per company/user
- Audit logging for retrieval queries
- PII masking before embedding

## Troubleshooting

### No Results Returned
1. Check similarity threshold (too high?)
2. Verify embeddings generated (check `embeddingModel` field)
3. Confirm companyId matches document

### Slow Retrieval
1. Check database indexes on companyId
2. Verify embedding batch size configuration
3. Consider reducing top-K or increasing threshold

### Embedding Errors
1. Verify OPENAI_API_KEY is set
2. Check rate limits (10 RPS for embeddings)
3. Confirm text is valid UTF-8

## Success Criteria ✅

- [x] Retrieval layer independent and replaceable (EmbeddingProvider interface)
- [x] AI service obtains context through retriever (no direct history loading)
- [x] Workflow orchestration unchanged (gradual integration)
- [x] Multiple embedding providers supported (OpenAI + Mock)
- [x] Complete type safety (no `any` types)
- [x] Configurable search parameters (threshold, top-K, chunk size)
- [x] Batch processing for efficiency
- [x] Company-based multi-tenant isolation
- [x] API endpoints for document management
- [x] Architecture documented
- [x] Built and compiling successfully
