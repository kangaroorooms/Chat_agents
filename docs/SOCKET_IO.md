# Socket.IO Infrastructure (Milestone 5)

This document describes the Socket.IO infrastructure added to the project. It provides the architecture, responsibilities, and configuration for future real-time features.

Goals
- Provide modular, extensible Socket.IO infra without implementing domain events yet.
- Support authentication, connection and room management, presence, and Redis adapter for horizontal scaling.

Files added
- `src/modules/socket/config.ts` — environment-driven configuration values.
- `src/modules/socket/socket.server.ts` — socket server initializer. Uses runtime `require` so libraries are optional at compile time.
- `src/modules/socket/token.middleware.ts` — socket auth middleware verifying JWT and attaching `socket.data.user`.
- `src/modules/socket/connectionManager.ts` — in-memory mapping of `userId` -> `socketId`s.
- `src/modules/socket/roomManager.ts` — helpers for `conversation:{id}`, `company:{id}`, `agent:{id}` rooms.
- `src/modules/socket/presenceManager.ts` — simple presence API; pluggable to Redis for scaling.
- `src/modules/socket/eventRegistry.ts` — central event name registry (no handlers yet).
- `src/modules/socket/redisAdapter.ts` — lazy-loaded Redis adapter wrapper using `ioredis` + `socket.io-redis` (runtime require).
- `src/modules/socket/types.ts` — common socket types (kept minimal to avoid compile-time dependency on socket.io).

Architecture notes
- Authentication: JWT verified in `socketAuthMiddleware` (uses existing `TokenService`). Token payload must include `userId`.
- Connection manager: tracks all active sockets per user in memory. For horizontal scaling replace with Redis set operations.
- Room manager: provides canonical room naming for conversation/company/agent rooms.
- Presence manager: currently in-memory; designed to be swapped with a Redis-backed implementation when scaling.
- Redis adapter: optional — if `REDIS_URL` is provided, `initRedisAdapter()` will initialize `ioredis` and attach the adapter at runtime. This avoids requiring Redis packages during development if not used.
- Event registry: central place to register and document all socket events. Handlers implemented for core message events in Milestone 6.

Socket lifecycle
- On `connection`, `socketAuthMiddleware` authenticates the client and `connectionManager.add` records the socket.
- On `disconnect`, the connection manager removes the socket mapping.

Error handling & reconnection
- Socket errors are surfaced via standard Socket.IO mechanisms. Reconnection strategy and acknowledgement patterns are implemented per-event as of Milestone 6.

Configuration
- All settings are in `src/modules/socket/config.ts` and read from environment variables:
  - `SOCKET_PATH` — socket path (default `/socket.io`)
  - `SOCKET_PING_INTERVAL`, `SOCKET_PING_TIMEOUT` — defaults for ping behavior
  - `SOCKET_RECONNECT_ATTEMPTS` — client reconnection attempts
  - `REDIS_URL` — if present, enables Redis adapter for horizontal scaling

How to run
- Ensure dependencies for Redis adapter and Socket.IO are installed when running production features:

  npm install socket.io ioredis socket.io-redis

- Start the server as usual; the socket server is initialized in `src/server.ts`.

Security considerations
- JWT tokens must be short-lived and revoked via refresh token flow; the socket auth middleware respects the same token verification as the HTTP API.
- Ensure CORS and origin checks are enforced at the HTTP layer and via AuthConfig.allowedOrigins.

Milestone 6 — Implemented Socket Events

Events implemented (infrastructure only — business logic remains in services):

- `room:join` — join a room. Payload: `{ type: 'conversation'|'company'|'agent', id: string }`. Ack: `(err, data)`.
- `room:leave` — leave a room. Payload: same as join.
- `message:create` — create a message. Payload: same as `CreateMessageSchema` in `src/modules/messages/message.dto.ts`. Server validates access and calls `MessageService.createMessage`. Emits `message:created` to conversation room. Ack returns created message or error.
- `message:update` — update a message. Payload: `{ messageId, content, metadata? }`. Server validates, calls `MessageService.editMessage`, emits `message:updated`.
- `message:delete` — soft-delete a message. Payload: `{ messageId }`. Server validates, calls `MessageService.deleteMessage`, emits `message:deleted` with `{ id }`.
- `recover` — client asks server to rejoin conversation rooms after reconnection. Payload: `{ conversationIds: string[] }`. Server validates per-room and rejoins available rooms.

Acknowledgements:
- All user-initiated events accept an acknowledgement callback. The server responds with `ack(null, data)` on success or `ack({ error: 'message' })` on failure.

Access Validation:
- Conversation access is validated using `ConversationService.getConversationById(userId, conversationId)` which throws if user lacks access.
- Company and agent room joins check `user.companyId` and `user.userId` respectively.

Error Handling:
- Events are wrapped in try/catch. Errors are returned via ack or silently skipped for recover rejoin attempts.

*** End of document
