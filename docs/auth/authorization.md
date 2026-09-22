# Zyvan Authorization & RBAC Matrix

Zyvan implements fine-grained, organization-scoped Role-Based Access Control (RBAC). Permissions are strictly scoped to the tenant (organization) within which the user is acting.

---

## 1. Centralized RBAC Matrix

Roles are hierarchical: $\text{OWNER} \succ \text{ADMIN} \succ \text{MEMBER} \succ \text{VIEWER}$.

| Resource | Action | OWNER | ADMIN | MEMBER | VIEWER |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **organizations** | `read` | ✅ | ✅ | ✅ | ✅ |
| | `update` | ✅ | ✅ | ❌ | ❌ |
| | `delete` | ✅ | ❌ | ❌ | ❌ |
| | `manage` | ✅ | ❌ | ❌ | ❌ |
| **members** | `read` | ✅ | ✅ | ✅ | ✅ |
| | `invite` | ✅ | ✅ | ❌ | ❌ |
| | `update_role` | ✅ | ❌ | ❌ | ❌ |
| | `remove` | ✅ | ✅ | ❌ | ❌ |
| **projects** | `read` | ✅ | ✅ | ✅ | ✅ |
| | `create` | ✅ | ✅ | ❌ | ❌ |
| | `update` | ✅ | ✅ | ❌ | ❌ |
| | `delete` | ✅ | ❌ | ❌ | ❌ |
| **destinations** | `read` | ✅ | ✅ | ✅ | ✅ |
| | `create` | ✅ | ✅ | ✅ | ❌ |
| | `update` | ✅ | ✅ | ✅ | ❌ |
| | `delete` | ✅ | ✅ | ❌ | ❌ |
| **events** | `read` | ✅ | ✅ | ✅ | ✅ |
| | `create` (ingest) | ✅ | ✅ | ✅ | ❌ |
| | `replay` | ✅ | ✅ | ✅ | ❌ |
| **api_keys** | `read` | ✅ | ✅ | ❌ | ❌ |
| | `create` | ✅ | ✅ | ❌ | ❌ |
| | `delete` (revoke) | ✅ | ✅ | ❌ | ❌ |
| **audit_logs** | `read` | ✅ | ✅ | ❌ | ❌ |

---

## 2. API Key Scope Mapping

Machine API keys do not have interactive user roles; they carry explicit scope strings. Zyvan's authorization engine normalizes scopes to permission pairs:

| Scope | Grants Permission |
| :--- | :--- |
| `*` or `admin` | All permissions across all resources |
| `events:write` | `events:create` |
| `events:read` | `events:read`, `deliveries:read` |
| `destinations:manage` | `destinations:create`, `destinations:update`, `destinations:delete`, `destinations:read` |
| `destinations:read` | `destinations:read` |
| `replay:execute` | `events:replay` |

---

## 3. Express Route Protection Guards

Zyvan provides composable higher-order route middleware for declarative security:

### Example: Protecting Route with Granular Permission
```typescript
import { Router } from 'express';
import { requireAuth, requirePermission } from '../auth/guards';

const router = Router();

// Only users or API keys with destinations:create can register webhooks
router.post(
  '/',
  requireAuth,
  requirePermission('destinations', 'create'),
  destinationController.createDestination
);

// Only OWNER or ADMIN can delete destinations
router.delete(
  '/:id',
  requireAuth,
  requirePermission('destinations', 'delete'),
  destinationController.deleteDestination
);
```

### Example: Restricting to Interactive Sessions
```typescript
import { requireSession, requireRole } from '../auth/guards';

// Organization settings require interactive session with OWNER role
router.patch(
  '/:organizationId',
  requireSession,
  requireRole('OWNER'),
  organizationController.updateOrganization
);
```

---

## 4. Audit Logging

Sensitive operations emit structured audit logs to PostgreSQL:
- `organization.created`, `organization.updated`, `organization.deleted`
- `member.invited`, `member.role_updated`, `member.removed`
- `api_key.created`, `api_key.revoked`
- `destination.created`, `destination.updated`, `destination.deleted`
- `event.replayed`

Each audit entry captures:
- `organizationId`
- `actorId` (userId or apiKeyId)
- `actorType` (`user` or `api_key`)
- `action`
- `resource` & `resourceId`
- `ipAddress` & `userAgent`
- `metadata` (JSON payload diff)
- `createdAt` timestamp
