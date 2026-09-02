# Tenant Security Audit

## Scope

Reviewed backend route registration, all module route files, controllers, services, and Prisma access patterns for tenant-owned resources. Protected business routes must derive tenant identity from authenticated `req.companyId`. Public ingress is limited to authentication, signed billing/email webhooks, and widget token requests.

## Issues Fixed

- Added reusable `assertConversationAccess`, `assertMessageAccess`, `assertKnowledgeAccess`, and `assertUserAccess` helpers.
- Added company ownership assertions before conversation reads, state changes, transfers, assignments, escalations, handoffs, participant changes, and deletes.
- Added company predicates to message creation, listing, reading, editing, deleting, and reply-target validation.
- Added company predicates to conversation participant and assignment target lookups.
- Added company predicates to knowledge reindex, delete, and training document reads.
- Removed analytics reliance on URL/query company IDs; analytics uses authenticated company context.
- Added authenticated company checks for AI settings, users, training, knowledge, conversations, messages, and analytics routers.
- Added cross-company body/path rejection for user and knowledge operations.
- Added API-key scopes, centralized scope enforcement, and audit logging for denied scopes.
- Added company-scoped webhook replay lookup.
- Added focused tenant and API-key security regression tests.

## Route Review

Tenant-protected routers:

- conversations
- messages
- users
- AI
- AI analytics
- agent assist
- knowledge
- knowledge training
- AI settings
- audit logs
- billing administration
- enterprise administration
- identity administration

Public or separately authenticated ingress:

- auth registration/login/refresh/logout
- widget routes, protected by widget token and origin validation
- signed billing webhook
- email provider webhook
- health and metrics endpoints
- SCIM endpoints, protected by hashed SCIM bearer tokens
- SAML ACS, protected by signed assertion validation and provisioned-company lookup

## Remaining Risks

- Some internal background workflow methods still accept resource IDs without a required company parameter. HTTP entry points assert ownership before calling them, but repository-level enforcement is not yet universal.
- Several legacy services use Prisma `as any`; generated Prisma model types should be adopted incrementally.
- Widget, webhook, SCIM, and SAML flows require external integration tests with real fixtures.
- Knowledge retrieval performs application-side cosine similarity over loaded chunks rather than indexed vector search.
- OAuth/OIDC providers beyond SAML are not implemented.
- API-key scopes are enforced centrally for API-key-authenticated requests, but route-specific scope policy should be reviewed as new integrations are added.
- Metrics and health endpoints are operationally useful but should be protected or isolated at the network boundary in production.
