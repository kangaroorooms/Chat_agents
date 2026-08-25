# Message Domain

This document describes the Message domain implemented in `src/modules/messages`.

Features:

- Message types: TEXT, IMAGE, FILE, SYSTEM, AI (future: AUDIO, VIDEO, LOCATION, CAROUSEL)
- DTOs and Zod validation
- Cursor-based pagination for message lists
- Message metadata for attachments and rich content
- Reply-to support via `replyToId`
- Soft delete (`isDeleted`, `deletedAt`)
- Edit history support via `MessageEdit` model
- Transactions for multi-step updates (message create + conversation update, edits)
- Thin controllers and business logic in services

Design notes and considerations:

- `Message.metadata` stores attachments and file info (url, filename, mime, size).
- `MessageEdit` stores prior or new edit entries; creating edits is transactional with message update.
- Listing messages uses cursor pagination ordered by `createdAt DESC` with `pagination.nextCursor`.
- Conversation-level `unreadCount` is incremented on create; this is a global counter and should be refined per-recipient in future.
- Long running operations or heavy indexes should be monitored for performance; indexes added: `@@index([conversationId])`, `@@index([createdAt])`.

Next steps:

- Implement message search and full-text indices if required.
- Implement per-user unread tracking in Message module.
- Add tests for transactions and edge cases.
