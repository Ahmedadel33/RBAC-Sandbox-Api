# Security Assessment Findings — Audex Sandbox API (v1)

**Auditor:** Cybersecurity & Governance Intern
**Scope:** postman_collection.json (Audex Sandbox API Contract)
**Target Directory:** security/

| THREAT ID | Vulnerability Type | Severity | Affected Endpoint(s) | Description | Concrete Fix |
|---|---|---|---|---|---|
| TRT-AUD-001 | IDOR / Broken Object-Level Authorization | Critical | `GET /api/projects/:id`, `PUT /api/projects/:id`, `DELETE /api/projects/:id` | Token auth is validated via cookie, but the API never checks whether the requested project belongs to the caller's department/scope, so any authenticated user can view, edit, or delete another department's projects by supplying an arbitrary project ID. | Add object-level authorization in the controller/middleware before any DB write: fetch the project, return 404 if missing, then `403` if `req.user.role !== 'admin' && project.department !== req.user.department`. |
| TRT-AUD-002 | Privilege Escalation / Mass Assignment | Critical | `POST /api/auth/register` | Public registration accepts `role` directly from the request body, so an unauthenticated attacker can register with `"role": "admin"` and gain full access immediately. | Hardcode new registrations to `role: "user"` server-side; strip `role` from the registration payload entirely. Role changes only via a dedicated admin-only route. |
| TRT-AUD-003 | Broken Function-Level Access Control | High | `POST/PUT/DELETE /api/roles*`, `POST/PUT/DELETE /api/permissions*` | These routes check authentication but not authorization — any logged-in standard user can call them to create/modify roles and permissions, including granting themselves elevated access. | Attach `authorizeRoles('admin')` middleware to every roles/permissions route: `router.use('/api/roles', authenticateToken, authorizeRoles('admin'))` (same for `/api/permissions`). |
| TRT-AUD-004 | Sensitive Data Exposure / Missing Transport Security | Medium | All authenticated endpoints (cookie-based token) | Auth tokens are set in cookies without enforced `HttpOnly`, `Secure`, and `SameSite=Strict` flags, leaving them exposed to XSS-based theft or CSRF. | Set cookie flags explicitly on issuance: `res.cookie('token', jwtToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' })`. |
