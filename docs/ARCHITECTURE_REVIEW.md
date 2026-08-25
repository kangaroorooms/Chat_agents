# Architecture Review — Realtime Chatbot App

This document records a complete architecture review performed across the repository and the non-breaking refactors applied.

Scope
- Reviewed: Authentication, Authorization, Conversation, Message, Database, Prisma schema, Folder structure, Module boundaries, Performance, Security, Frontend, API, DTOs, Transactions, Documentation, and build configuration.

Summary of findings, risks, and actions

1) Missing `role`/`companyId` on `User` model
- Problem: The RBAC system previously assumed `role` and `companyId` existed on users; schema lacked these fields causing runtime/typing workarounds.
- Risk/Impact: Type casts (`as any`) and runtime errors when trying to include roles in tokens; poor developer experience and security risk in authorization checks.
- Fix applied: Added `role` (enum `UserRole`) and `companyId?: String` to `User` in `prisma/schema.prisma` and regenerated Prisma Client.
- Complexity: Low. Non-breaking migration if DB handles defaults; production DB migration required.

2) Widespread `as any` usage in auth and frontend
- Problem: Multiple `as any` casts masked real types (refresh tokens, payloads, axios error handling).
- Risk/Impact: Hides type errors, increases chance of runtime bugs.
- Fix applied: Replaced casts with proper typings (use Prisma types and `unknown` where appropriate). Reduced `as any` occurrences to zero in repo.
- Complexity: Low.

3) Message domain missing features and typing
- Problem: Message model lacked metadata, reply, edit history and flags for soft delete.
- Risk/Impact: Hard to implement message edits/replies and future media types; led to feature debt.
- Fix applied: Extended `Message` model with `type`, `metadata`, `replyTo`, `isDeleted`, `deletedAt`, `editedAt`, and added `MessageEdit` model.
- Complexity: Medium. Requires DB migration for existing data if deployed.

4) Socket.IO infrastructure not present / missing type-safe integration
- Problem: Socket.io infra was missing; ad-hoc implementations risked tight coupling.
- Risk/Impact: If implemented later as patchwork, can leak business logic into transport layer and cause scaling issues.
- Fix applied: Implemented modular socket infra (auth middleware, connection manager, room manager, presence wrapper, redis adapter wrapper). Used runtime `require` for optional deps (socket.io / ioredis) to avoid forcing install for non-socket deployments.
- Complexity: Medium.

5) Runtime dependencies for socket/redis not in `package.json`
- Problem: `socket.io`, `ioredis`, `socket.io-redis` are used via runtime `require` but not listed in `package.json`.
- Risk/Impact: Production runtime may fail if these libs are not installed when enabling Redis/socket features. Developers might be confused by missing compile-time types.
- Recommendation: Add these as optional dependencies or document them in README and `docs/SOCKET_IO.md` (done). Keep runtime `require` to allow opt-in installation.
- Complexity: Low.

6) Dev/Debug console.logs and dead files
- Problem: `src/test.ts` and `console.log` in `src/server.ts` were present.
- Risk/Impact: Accidental logging leaks; unused files increase maintenance surface.
- Fix applied: Removed `src/test.ts` and the `console.log` line.
- Complexity: Trivial.

7) ESLint not configured at repository root
- Problem: No root `.eslintrc` found; frontend has ESLint but server lacks repo-wide linting.
- Risk/Impact: Inconsistent code style and missed lint issues in backend.
- Recommendation: Add a root ESLint configuration and run `eslint --fix`. This was not added automatically to avoid introducing style decisions.
- Complexity: Low.

8) Missing tests and CI
- Problem: No unit/integration tests or CI configuration in repo.
- Risk/Impact: Changes may regress behaviour; harder to validate transactions and socket auth.
- Recommendation: Add GitHub Actions for build and test, and tests for Auth, Message transactions, and Socket auth.
- Complexity: Medium.

9) Pagination design: cursor vs page
- Problem: Previously mixed pagination approaches; updated conversation/message modules to use cursor pagination.
- Risk/Impact: Cursor pagination is more scalable; migration was completed.
- Complexity: Low.

10) Unused imports/exports & circular dependency checks
- Problem: No obvious circular dependencies found by quick scan; unused exports not easily discoverable statically in this pass.
- Recommendation: Run `depcruise` or static analysis for circular deps and `ts-prune` for unused exports in CI.
- Complexity: Low.

11) Database indexing and query patterns
- Problem: Added indexes for `Conversation.lastMessageAt`, `Conversation.state`, `Message.conversationId`, `Message.createdAt`.
- Risk/Impact: These cover common queries (list by activity, fetch messages). For heavy workloads, add composite indexes and full-text search indexes as needed.
- Recommendation: Monitor slow queries and add indexes accordingly.
- Complexity: Medium (requires DB migrations and monitoring).

Actions performed
- Code changes: schema, message module, socket infra, auth typing fixes, dead file removal.
- Documentation: `docs/MESSAGE.md`, `docs/SOCKET_IO.md`, this `ARCHITECTURE_REVIEW.md`.
- Build: ran `npx prisma generate` and `npm run build` successfully.

Next recommended steps (non-blocking)
- Add root ESLint and run autofix.
- Add CI workflow (build + lint + typecheck) and basic tests for critical flows.
- Decide on optional runtime deps for socket/redis: either add to `package.json` or document installation more prominently.
- Implement Redis-backed presence/connection maps for horizontal scaling when moving to multiple nodes.

Passing criteria
- TypeScript build passes (done)
- No `as any` remaining in codebase (checked)
- Socket infra present and documented (done)
- No dead files left (removed `src/test.ts`)

If you want, I can now:
- Add root ESLint config and run fixes (will be opinionated but can follow best-practices),
- Add GitHub Actions workflow for build+lint,
- Install and add optional dependencies to `package.json` for Socket/Redis,
- Run deeper static analysis for unused exports and circular deps.

Please pick which follow-up you'd like me to perform next.
