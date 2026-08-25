# AI Tool Registry

This document lists the available AI tools registered in the `toolRegistry` and their input schemas.

All tools expose the following properties:

- `name`: Unique tool identifier
- `description`: Short human readable description
- `inputSchema`: Zod schema describing expected input
- `execute(input)`: Executes the tool and returns a Promise

Registered tools (v1):

1. `searchKnowledge`
   - Description: Search the company knowledge base for relevant documents
   - Input Schema:
     - `query: string` (required)
     - `companyId: string` (required)
     - `topK?: number`
     - `threshold?: number`

2. `summarizeConversation`
   - Description: Generate a conversation summary and store it on the conversation via the workflow layer
   - Input Schema:
     - `conversationId: string` (required)
     - `performedById?: string` (optional; defaults to `AI_SYSTEM`)

3. `assignConversation`
   - Description: Assign a conversation to an agent via the conversation workflow
   - Input Schema:
     - `performedById: string` (who performs the assignment)
     - `conversationId: string`
     - `ownerId: string` (agent id)

4. `transferConversation`
   - Description: Transfer conversation ownership to another agent via workflow
   - Input Schema:
     - `performedById: string`
     - `conversationId: string`
     - `toAgentId: string`

5. `lookupCustomer`
   - Description: Lookup basic customer information via `UserService`
   - Input Schema:
     - `customerId: string`

Usage

Programmatically invoke a tool:

```ts
import { toolRegistry } from 'src/modules/ai/tools'

const results = await toolRegistry.execute('searchKnowledge', { query: 'reset password', companyId: 'company-123' })
```

Notes

- Tools MUST call only the service or workflow layers — they should not access Prisma directly.
- The registry validates inputs with Zod before execution.
- Add new tools by creating a module under `src/modules/ai/tools` and registering it in `src/modules/ai/tools/index.ts`.
