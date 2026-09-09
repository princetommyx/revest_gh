---
name: security
description: Secure web and desktop application development. Use when writing authentication, authorization, API endpoints, form handling, database queries, file uploads, Electron apps, Tauri apps, IPC handlers, cryptography, secrets management, security headers, input validation, or when reviewing code for vulnerabilities. Covers OWASP Top 10, XSS, CSRF, SQL injection, SSRF, command injection, path traversal, and desktop app security. On Revesta specifically, load this before touching auth/JWT settings, CORS config, password handling, secrets/env vars, any endpoint that takes a URL or file from a user, or the admin dashboard's forms - even if the user just says something "feels insecure" or asks for a security review, without naming OWASP categories explicitly.
argument-hint: [area to secure or review]
---

# Application Security

You are a security-focused engineer. Every line of code you write or review must defend against real attack vectors. You don't add security theater — you implement defenses that stop actual exploits.

Read the detailed reference files in `${CLAUDE_SKILL_DIR}` for comprehensive patterns:

- `web-security.md` — XSS, CSRF, injection, SSRF, path traversal, input validation, security headers
- `auth-and-secrets.md` — Authentication, JWT, OAuth2 PKCE, API keys, password hashing, secrets management
- `desktop-security.md` — Electron and Tauri hardening, IPC security, auto-updater, deep links, sandboxing
- `database-and-deps.md` — SQL injection prevention, ORM security, connection management, dependency supply chain

## Security-First Mindset

When writing or reviewing code, always ask:

1. **What can an attacker control?** — Every external input is hostile: URL params, headers, cookies, form data, file uploads, WebSocket messages, deep links, IPC messages
2. **What's the blast radius?** — If this is exploited, what's the worst case? RCE > data theft > DoS > information leak
3. **Am I validating at the boundary?** — Validate where data enters the system, not deep inside

## Quick Reference: The Non-Negotiables

### Web Apps
```
✗ NEVER concatenate user input into SQL, HTML, shell commands, or URLs
✗ NEVER use eval(), Function(), innerHTML with untrusted data
✗ NEVER store secrets in code, localStorage, or client-accessible locations
✗ NEVER disable CORS, CSP, or same-origin protections without justification
✗ NEVER use MD5/SHA1 for passwords — use Argon2id or bcrypt
✗ NEVER use Math.random() for security tokens — use crypto.randomBytes()
✗ NEVER trust client-side validation alone

✓ ALWAYS use parameterized queries (prepared statements, ORMs)
✓ ALWAYS set HttpOnly, Secure, SameSite on auth cookies
✓ ALWAYS escape output in the context it's rendered (HTML, JS, URL, CSS)
✓ ALWAYS validate and sanitize input at system boundaries
✓ ALWAYS use HTTPS + HSTS in production
✓ ALWAYS implement rate limiting on auth endpoints
✓ ALWAYS use CSP headers — start with default-src 'self'
```

### Desktop Apps (Electron)
```
✗ NEVER enable nodeIntegration in renderer
✗ NEVER disable contextIsolation or webSecurity
✗ NEVER expose raw ipcRenderer to renderer process
✗ NEVER use the remote module (deprecated, dangerous)
✗ NEVER load remote URLs without URL validation

✓ ALWAYS enable contextIsolation + sandbox
✓ ALWAYS use contextBridge with minimal, validated API surface
✓ ALWAYS validate IPC sender identity and message schema
✓ ALWAYS validate deep link URLs before processing
✓ ALWAYS use code signing for distribution
```

### Desktop Apps (Tauri)
```
✗ NEVER allow unrestricted shell execution
✗ NEVER use broad file system scopes
✗ NEVER skip command input validation (even with Rust types)

✓ ALWAYS use invoke() pattern (not raw events) for sensitive ops
✓ ALWAYS configure restrictive scopes (fs, http, shell)
✓ ALWAYS set CSP in tauri.conf.json
✓ ALWAYS define per-window capabilities (least privilege)
```

## Vulnerability Response Patterns

When you detect a vulnerability in code:

| Vulnerability | Immediate Fix |
|--------------|---------------|
| SQL injection | Switch to parameterized queries |
| XSS (reflected/stored) | Escape output + add CSP header |
| Command injection | Use spawn() with array args, never exec() with strings |
| Path traversal | Resolve path, verify it starts with allowed directory |
| CSRF | Add SameSite=Strict cookies + CSRF tokens |
| SSRF | Validate URL against allowlist, block private IP ranges |
| Insecure auth cookie | Add HttpOnly, Secure, SameSite flags |
| Hardcoded secret | Move to env var, rotate the exposed secret |
| Weak password hash | Migrate to Argon2id with proper parameters |
| Electron nodeIntegration | Set false + enable contextIsolation + sandbox |

## Critical Rules

1. **Validate at boundaries** — Every system edge (HTTP, IPC, file read, DB query) needs validation
2. **Defense in depth** — Never rely on a single security control; layer defenses
3. **Principle of least privilege** — Grant minimum access needed; restrict tools, scopes, permissions
4. **Fail closed** — Errors should deny access, not grant it; default to rejection
5. **Never trust the client** — All client data is attacker-controlled until validated server-side
6. **Secrets never in code** — Use env vars, vaults, or OS keychains; rotate exposed secrets immediately
7. **Escape for the output context** — HTML entities for HTML, parameterized for SQL, array args for shell
8. **Use established crypto** — Argon2id for passwords, AES-256-GCM for encryption, crypto.randomBytes() for tokens
9. **Pin dependencies** — Use lock files, audit regularly, verify integrity with SRI for CDN resources
10. **Log security events** — Failed logins, permission denials, input validation failures; never log secrets

## Using This Skill

If `$ARGUMENTS` specifies an area (e.g., `/security authentication`), read the relevant reference file and focus there. Otherwise, apply security principles to whatever code you're currently writing or reviewing.

When reviewing existing code, scan for the vulnerability patterns in the reference files and flag each finding with severity (Critical/High/Medium/Low) and a concrete fix.

---

## Revesta-specific notes

The reference files above are Node/Express-flavored (Electron, Tauri, `crypto`, `express-rate-limit`). Revesta's backend is **Django REST Framework + MySQL** with **djangorestframework-simplejwt**; the client is **React Native/Expo** (mobile) plus a **React admin dashboard** (`admin/`) — there is **no Electron or Tauri app**, so `desktop-security.md` doesn't apply here; don't reach for it unless a real desktop build gets added later.

**Known findings as of this skill's creation (2026-09-09) — worth fixing, not just filing away:**

- **`backend/revesta_backend/settings.py:38`** — `SECRET_KEY` has a hardcoded fallback (`'django-insecure-db+...'`) baked into committed source. It's only used if the `SECRET_KEY` env var is unset, but the fallback value is sitting in git history, and it's also the JWT `SIGNING_KEY` (`settings.py:401`) — anyone who reads it can forge tokens if the env var was ever actually missing in production. Fix: remove the fallback (`os.environ['SECRET_KEY']`, fail loudly if unset) and rotate the key if there's any chance the fallback was ever live.
- **`backend/revesta_backend/settings.py:217-232`** — `CORS_ALLOW_ALL_ORIGINS = True` combined with `CORS_ALLOW_CREDENTIALS = True`. With `django-cors-headers`, that combination reflects the request's `Origin` header instead of sending `*`, which means any website can make credentialed requests against the API from a logged-in user's browser. There's already a `print("WARNING: ...")` in the code acknowledging this — it just isn't wired to actually stop it in production. Fix: gate `CORS_ALLOW_ALL_ORIGINS` behind `DEBUG` (or an explicit env flag), and use the existing `CORS_ALLOWED_ORIGINS` allowlist path in production.
- **No explicit `PASSWORD_HASHERS` override** — Django's default (PBKDF2) is acceptable but not the Argon2id this skill recommends. Low priority; `pip install django[argon2]` (or `argon2-cffi`) and prepending `Argon2PasswordHasher` to `PASSWORD_HASHERS` upgrades new hashes without breaking existing ones (Django re-hashes on next login automatically).
- **`SIMPLE_JWT.ACCESS_TOKEN_LIFETIME` is 60 minutes**, longer than this skill's 15-minute guideline. `ROTATE_REFRESH_TOKENS` and `BLACKLIST_AFTER_ROTATION` are both already correctly enabled, which is the more important control — treat the 60-minute window as a judgment call to revisit, not an emergency.
- **`mobile/src/lib/supabaseClient.js`** hardcodes a Supabase anon/publishable key as a fallback default — lower severity than a service-role key (anon keys are meant to be public-ish and gated by Row Level Security), but still worth moving to `EXPO_PUBLIC_SUPABASE_ANON_KEY`-only with no hardcoded fallback, and confirming RLS is actually configured on the Supabase tables it writes to.

**Stack translation notes:**

| Reference pattern (Node/TS) | Revesta equivalent (Django/DRF) |
|---|---|
| Parameterized queries / Prisma safe-by-default | Django ORM is parameterized by default; only `.raw()` and `extra()` need manual care — never f-string/`.format()` a query |
| `argon2`/`bcrypt` password hashing | `PASSWORD_HASHERS` setting (see finding above); Django handles hashing transparently via `set_password()`/`check_password()` |
| JWT access + refresh pattern | Already implemented via `djangorestframework-simplejwt` — see `SIMPLE_JWT` in settings.py |
| `express-rate-limit` on auth endpoints | `django-ratelimit` or DRF `throttle_classes`, Redis-backed via the already-installed `django-redis` (see the `revesta-scalability` skill's rate limiting section) |
| CSP / security headers via `helmet` | `django-csp` (not currently installed) for CSP; Django's `SecurityMiddleware` already covers `X-Content-Type-Options`, HSTS (`SECURE_HSTS_SECONDS`), and `X-Frame-Options` if configured |
| CORS allowlist via `cors` package | `django-cors-headers`, already installed — see the finding above for the current misconfiguration |
| SSRF allowlisting for outbound fetches | Applies directly to any server-side call that takes a user- or admin-supplied URL (promo card `image_url`/`action_value`, webhook URLs) — validate protocol + hostname before `requests.get()` |
| File upload validation (mimetype + magic bytes) | Applies to listing/verification photo uploads — DRF's `ImageField` checks extension/mimetype but not magic bytes; consider `python-magic` for anything security-sensitive (KYC/identity verification uploads) |
| Dependency auditing (`npm audit`, lock files) | `mobile/package-lock.json` is committed (good); `backend/requirements.txt` uses loose version ranges (`Django>=4.2,<5.0`) rather than exact pins — run `pip-audit` periodically since there's no lock file pinning exact resolved versions |
