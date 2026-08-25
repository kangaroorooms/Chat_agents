# Conversation Domain

This document describes the Conversation domain implemented in `src/modules/conversations`.

Key capabilities:

- Conversation lifecycle and states: `OPEN`, `PENDING`, `CLOSED`, `ARCHIVED`.
- Conversation ownership/assignment via `ownerId`.
- Participants management (add/remove participants).
- Soft delete (`isDeleted`, `deletedAt`).
- Cursor-based pagination for listing conversations.
- DTOs and validation using Zod.
- Thin controllers and business logic in services.

## Data model highlights

See `prisma/schema.prisma` for authoritative model definitions. Notable fields on `Conversation`:

- `title?: String` — optional human-readable title.
- `state: ConversationState` — enum for lifecycle.
- `ownerId?: String` — assigned agent or owner.
- `unreadCount: Int` — per-conversation unread counter (maintain in messages layer).
- `metadata: Json?` — flexible metadata for AI/flags.
- `lastMessageAt: DateTime?` — used for sorting and cursor pagination.
- `isDeleted`, `deletedAt` — soft delete support.

Indexes:

- `@@index([lastMessageAt])` — supports listing by last activity.
- `@@index([state])` — supports queries by state.

## API Endpoints

- `POST /api/conversations` — create a new conversation with a participant. Body: `participantId`, optional `title`.
- `GET /api/conversations?limit=20&cursor=<conversationId>&search=...&state=OPEN` — list conversations using cursor-based pagination. Response includes `pagination.nextCursor` when more results available.
- `GET /api/conversations/:conversationId` — get conversation details (participants + messages).
- `DELETE /api/conversations/:conversationId` — soft-delete (marks `isDeleted=true`).
- `PATCH /api/conversations/:conversationId/state` — change conversation state. Body: `{ state: 'CLOSED' }`.
- `POST /api/conversations/:conversationId/participants` — add participant. Body: `{ userId }`.
- `DELETE /api/conversations/:conversationId/participants/:participantId` — remove participant.
- `PATCH /api/conversations/:conversationId/assign` — assign owner. Body: `{ ownerId }`.

## Pagination

Uses cursor-based pagination. Provide `cursor` equal to the last item `id` from previous page and `limit` to fetch the next page. The response returns `pagination.nextCursor` when more results are available.

## Validation / DTOs

Zod schemas live in `src/modules/conversations/conversation.dto.ts` and are used in controllers to validate input.

## Design notes

- Controllers are thin and delegate all business logic to `ConversationService`.
- Database operations use the generated Prisma client for strong typing.
- Many features (unread counts, message-level metadata, AI hints) are planned in the Message module and integrated via `metadata` and `unreadCount` in `Conversation`.
- All multi-step DB operations should run in transactions in the Message module when updating conversation + message + counters.

## Next steps

- Implement `Message` module: message creation, streaming, unread count updates (transactional), and message indexes.
- Add tests and end-to-end validation.
