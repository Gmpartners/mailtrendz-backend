# Code Analysis Report - MailTrendz Backend

**Date**: 2026-02-06
**Scope**: Full codebase review (~70 TypeScript files, ~7,500 LOC)

## Critical Findings

### 1. Hardcoded Credentials in Source Code

| Location | Issue |
|----------|-------|
| `src/middleware/credits.middleware.ts:174-179` | Bypass email list hardcoded |
| `src/controllers/subscription.controller.ts:945-948` | User ID and email for emergency ops |
| `src/middleware/admin.middleware.ts:7-11` | Admin emails exposed in code |

**Recommendation**: Move all credentials to environment variables.

### 2. Disabled Input Validation

- `src/routes/project.routes.ts:27-63` — Project creation validation commented out (`// validateCreateProject`, "TEMPORARIAMENTE DESABILITADO")
- No length validation on object/JSON fields in `validation.middleware.ts`

**Recommendation**: Re-enable validation middleware immediately.

### 3. Credit Consumption Timing Bug

- `src/services/subscription.service.ts:406-459` — Credits consumed AFTER AI generation
- `src/services/project.service.ts:139-146` — Credit consumption in silent try-catch

**Recommendation**: Consume credits BEFORE the AI operation; rollback on failure.

## Security Issues

### High Severity

- **RLS Bypass**: `supabase.config.ts:84-98` — Admin client used everywhere, RLS policies bypassed. Application-level userId validation is the only protection.
- **Stripe Key Fallback**: `stripe.service.ts:5-7` — Falls back to empty string if env var missing, causing silent failures.

### Medium Severity

- **Debug Endpoints Exposed**: `ai.routes.ts:53-86` — `/ai/debug/context/:chatId` accessible without proper auth
- **No CSRF Protection**: No CSRF token validation on state-changing operations
- **Rate Limit Bypass**: `rate-limit.middleware.ts:174-179` — Hardcoded emails skip rate limiting

## Performance Issues

| Issue | Location | Impact |
|-------|----------|--------|
| N+1 query in getStats() | `project.service.ts:859-882` | Timeout with >1000 projects |
| Unbounded queries | `auth.service.ts:369-370` | Memory exhaustion |
| No cache eviction policy | `subscription.service.ts:19-22` | Gradual memory leak |
| Missing DB indexes on search | `project.service.ts:627-628` | Full table scans |

## Race Conditions

- **Chat + Project Creation** (`chat.service.ts:56-78`, `project.service.ts:260-361`) — No atomic transaction, concurrent requests can create duplicate chats
- **Project succeeds even if chat fails** — Inconsistent state

## Code Quality

### Pending TODOs (6)

- `webhook.routes.ts:82` — Admin role verification not implemented
- `translation.controller.ts:109, 196, 212` — Unimplemented features
- `translation.routes.ts:20` — Admin middleware missing

### Code Duplication

- Credit balance extraction repeated 3x in `auth.service.ts`
- Subscription state processing duplicated in `subscription.service.ts` (lines 127-177 and 325-400)

### Deprecated Code Still Present

- `stripe.service.ts:504-523` — Methods marked deprecated but still exist
- `app.ts:53` — Temporary port (8001) hardcoded instead of 8000

## Configuration Issues

- Port hardcoded to 8001 in `app.ts:53` with comment "TEMPORÁRIO"
- AI model defaults scattered across `iaservice.ts:52` and `ai.routes.ts:146`
- Stripe price ID naming inconsistency: 'pro' vs 'starter' fallbacks in `stripe.service.ts:31-32`

## Severity Summary

| Category | Count | Severity |
|----------|-------|----------|
| Hardcoded Credentials | 3 | CRITICAL |
| Missing Validation | 2 | HIGH |
| Race Conditions | 2 | HIGH |
| N+1 Queries | 2 | MEDIUM |
| Pending TODOs | 6 | MEDIUM |
| Code Duplication | 3 | MEDIUM |
| Unbounded Queries | 3 | MEDIUM |
| Deprecated Code | 4 | MEDIUM |

## Recommended Actions (Priority Order)

1. Move hardcoded credentials to environment variables
2. Re-enable validation on project creation routes
3. Consume credits BEFORE AI operations (not after)
4. Implement atomic transactions for project + chat creation
5. Remove or secure debug endpoints in production
6. Centralize Stripe price and AI model configuration
7. Add database indexes for frequently filtered columns
8. Implement cache eviction policy
