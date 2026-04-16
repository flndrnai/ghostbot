# Security Policy

## Reporting a vulnerability

**Please do not open a public GitHub issue for security reports.**

Contact options, in order of preference:

1. **GitHub private security advisory** — use the Security tab on the repo and click "Report a vulnerability". This is the fastest and most secure channel.
2. **Email** the maintainer address listed on the [repo's GitHub profile](https://github.com/flndrnai).

We aim to acknowledge reports within **72 hours** and provide a triage assessment within **7 days**.

## Scope

GhostBot is a self-hosted AI coding agent platform. Security reports in scope:

- Authentication / authorization bypass (NextAuth, role checks, invitation flow)
- Remote code execution (command injection, deserialization, subprocess spawning)
- Cross-tenant data leakage (one user reading/modifying another user's resources)
- Webhook signature bypass (GitHub PR triggers, Telegram, generic `/api/webhook/*`)
- Path traversal in the Project Connect file-system API
- Encryption-at-rest weaknesses (AES-256-GCM / PBKDF2 key derivation)
- Docker socket escape / privilege escalation via agent containers
- Sensitive data exposure (secrets in responses, headers, logs)

Out of scope:

- Denial-of-service / resource exhaustion — GhostBot is intended for single-tenant trusted-admin deployments
- Self-XSS that requires the user to paste attacker-supplied content into their own browser console
- Reports assuming an attacker already has `AUTH_SECRET` or database access
- Issues in third-party dependencies that are not reachable by GhostBot code paths

## Threat model

GhostBot is **designed to run inside your own perimeter** — a personal VPS, a home server, or a small trusted team's deployment. It is **not hardened for public multi-tenant hosting.**

Assumptions:

- Admins (`role: 'admin'`, `owner: 1`) are fully trusted
- Invited users (`role: 'user'`) should have no access to other users' data, admin config, or the Docker socket
- The Docker host is single-tenant to the admin(s)
- `AUTH_SECRET` is kept secret — it's the root of all encryption

Anything that breaks the second assumption (cross-tenant access from a `user`-role account to another user's resources) is in scope and will be treated as a priority issue.

## What ships enabled by default

- Password hashing: bcrypt
- Secret storage: AES-256-GCM, key derived via PBKDF2 from `AUTH_SECRET`
- Sessions: NextAuth v5 JWT with role + owner claims
- CSRF: handled by NextAuth on auth forms; server actions protected by Next.js's built-in origin check
- Webhook verification: HMAC-SHA256 with constant-time compare (GitHub, Telegram, generic webhook, cluster-role webhook) — all fail closed if the secret is unset
- Rate limiting: in-process sliding window on chat, webhooks, auth, and project clone
- Path traversal defense on Project Connect file API: absolute-path resolve + prefix check + `realpathSync` symlink check

## Hardening recommendations before public exposure

See the [Security section of the README](README.md#security) for the complete checklist. Key items:

1. Put `/var/run/docker.sock` behind `tecnativa/docker-socket-proxy` with a restrictive allowlist
2. Enforce per-agent container resource limits (Memory, NanoCpus, PidsLimit, wall-clock timeout)
3. Configure every webhook secret before exposing the endpoints
4. Never trust `user`-role accounts — treat them as a low-privilege tier, not as admins-in-waiting

## Disclosure policy

We follow a coordinated disclosure model:

1. You report privately via GitHub advisory or email
2. We confirm and assess within 7 days
3. We work on a fix; if it takes longer than 30 days we will tell you why
4. We coordinate a public disclosure date with you before releasing the fix
5. You are credited in the changelog and the GitHub advisory unless you request anonymity

Thank you for helping make self-hosted AI tooling safer.
