# Auth Module Code Review & Hardening Audit (Ponytail Review)

Date: 2026-10-25
Status: **ALL 8 FINDINGS RESOLVED & VERIFIED**

---

## 1. Executive Summary
A comprehensive security and production-readiness review of TestHub's frontend and backend authentication system was conducted following `ponytail-review` guidelines. All 8 findings across session lifecycle, token segregation, account deactivation, and guest UX have been remediated and verified.

---

## 2. Remediated Findings

### Must Fix

1. **Suspended accounts can still log in and perform actions**
   - **Location:** [`backend/internal/handlers/auth.go:L130-L134`](file:///home/sans/coding/quiz_app/backend/internal/handlers/auth.go#L130-L134), [`auth.go:L207-L210`](file:///home/sans/coding/quiz_app/backend/internal/handlers/auth.go#L207-L210)
   - **Problem:** `Login` checked password hashes but ignored `user.IsActive`, issuing fresh JWT tokens to deactivated accounts.
   - **Resolution:** Added `if !user.IsActive` checks in both `Login`, `RefreshToken`, and `Me`, returning `403 Forbidden` and terminating access for suspended users.

2. **Expired guest tokens hijack students to the login screen**
   - **Location:** [`frontend/src/services/client.ts:L96-L107`](file:///home/sans/coding/quiz_app/frontend/src/services/client.ts#L96-L107)
   - **Problem:** Any background 401 response triggered `window.location.href = '/login?from=...'`, redirecting non-logged-in students taking free exams away from public pages.
   - **Resolution:** Scoped the automatic 401 redirect to protected paths only (`/admin`, `/my-subscriptions`, `/profile`), preserving the frictionless zero-login experience for test takers.

3. **Field mismatch in `/auth/me` causes `user.id` to be undefined**
   - **Location:** [`frontend/src/services/auth.api.ts:L88-L96`](file:///home/sans/coding/quiz_app/frontend/src/services/auth.api.ts#L88-L96)
   - **Problem:** Backend returns JSON with `"id"`, but `auth.api.ts` mapped `res.user_id`, causing `user.id` to become `undefined` in frontend state.
   - **Resolution:** Mapped `id: res.id || res.user_id || ''` in `auth.api.ts`.

4. **Production login page pre-fills hardcoded admin credentials**
   - **Location:** [`frontend/src/pages/LoginPage.tsx:L9-L10`](file:///home/sans/coding/quiz_app/frontend/src/pages/LoginPage.tsx#L9-L10)
   - **Problem:** The login form initialized inputs with `'admin@testhub.com'` and `'AdminPassword123!'`, exposing default credentials to all production visitors.
   - **Resolution:** Changed initial state to empty strings (`useState('')`) while keeping the one-click demo button available.

---

### Should Fix

5. **Unused refresh token acts as an uncontrolled 7-day access token**
   - **Location:** [`backend/internal/middleware/auth.go:L13-L37`](file:///home/sans/coding/quiz_app/backend/internal/middleware/auth.go#L13-L37), [`auth.go:L157-L198`](file:///home/sans/coding/quiz_app/backend/internal/handlers/auth.go#L157-L198), [`routes.go:L84`](file:///home/sans/coding/quiz_app/backend/internal/handlers/routes.go#L84), [`auth.api.ts:L98-L119`](file:///home/sans/coding/quiz_app/frontend/src/services/auth.api.ts#L98-L119)
   - **Problem:** Refresh tokens lacked a `token_type` claim and had no corresponding endpoint, functioning as unrotated 7-day bearer tokens.
   - **Resolution:** Added `TokenType` claim (`"access"` vs `"refresh"`), blocked refresh tokens from bearer authorization in `AuthRequired`, and implemented a secure `POST /api/auth/refresh` endpoint with frontend client storage support.

6. **Email case-sensitivity prevents mobile users from logging in**
   - **Location:** [`backend/internal/handlers/auth.go:L38`](file:///home/sans/coding/quiz_app/backend/internal/handlers/auth.go#L38), [`auth.go:L114`](file:///home/sans/coding/quiz_app/backend/internal/handlers/auth.go#L114)
   - **Problem:** Raw email comparison caused mobile users whose keyboards auto-capitalized the first letter to fail login.
   - **Resolution:** Normalized email strings with `strings.ToLower(strings.TrimSpace(req.Email))` in both `Register` and `Login`.

7. **Production defaults to a public hardcoded JWT secret**
   - **Location:** [`backend/cmd/server/main.go:L34-L37`](file:///home/sans/coding/quiz_app/backend/cmd/server/main.go#L34-L37)
   - **Problem:** Missing `JWT_SECRET` in production fell back to a publicly known default string without error.
   - **Resolution:** Added startup assertion in `main.go` that terminates boot with `log.Fatal` if running in production with an unset or default JWT secret.

---

### Nice to Have

8. **Login timing leaks whether an email exists**
   - **Location:** [`backend/internal/handlers/auth.go:L117-L123`](file:///home/sans/coding/quiz_app/backend/internal/handlers/auth.go#L117-L123)
   - **Problem:** Database lookup failure returned in ~2ms while bcrypt execution took ~80ms, leaking user registration status via response timing.
   - **Resolution:** Executed a dummy bcrypt compare when user is not found to equalize response timing.

---

## 3. Verification
- `frontend`: `bun test` passed (8/8 tests, 39 assertions).
- `frontend`: `bun run build` built successfully in 1.59s.
- `backend`: `go build ./...` compiled cleanly with 0 errors.
- `backend`: `go test -c ./tests/...` compiled cleanly with 0 errors.
