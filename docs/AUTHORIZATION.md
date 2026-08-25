# Authorization (RBAC)

This project implements Role Based Access Control (RBAC) to protect sensitive
endpoints and capabilities.

## Roles

- `CUSTOMER` — end users of the chat product.
- `AGENT` — human support agents who handle conversations.
- `ADMIN` — administrative users with broad privileges.
- `SUPER_ADMIN` — full system administrators.

Role definitions and permissions are defined in `src/config/roles.ts`.

## Permissions

Permissions are string-based and attached to roles in `RolePermissions`.
Services should check permissions via `requirePermission(permission)` when
finer-grained checks are needed.

## Middleware

- `authMiddleware` — verifies access tokens and attaches `req.user` and
  `req.userId`.
- `requireRole(roles)` — restricts a route to one or more roles.
- `requirePermission(permission)` — restricts a route to roles that include
  the permission.

Usage example in routes:

```ts
import { authMiddleware } from '../../middleware/auth.middleware'
import { requireRole } from '../../middleware/authorize.middleware'

router.get('/users', authMiddleware, requireRole(['ADMIN','SUPER_ADMIN']), getUsers)
```

## Best practices

- Keep controllers thin — use services for business logic.
- Use `requirePermission` for fine-grained checks (resource scopes).
- Audit role and permission changes in `RolePermissions`.
