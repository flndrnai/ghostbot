# Scaling GhostBot — single-server ceiling and the path beyond

GhostBot is intentionally a **single-server, single-SQLite-file** application. This document explains where that ceiling actually is, how to know when you're approaching it, and what the migration path looks like if you outgrow it.

**Bottom line:** a single Dokploy VPS running GhostBot comfortably serves one person full-time, a small team (5-10 people) with light agent-job usage, or a team of 20-50 who mainly chat (no heavy agent traffic). Beyond that, you start hitting architecture limits, not hardware limits.

---

## What a single GhostBot instance handles well

| Dimension | Comfortable ceiling | Why |
|---|---|---|
| **Concurrent active users** | 10-20 chatting simultaneously | SSE connections are lightweight; the bottleneck is LLM throughput |
| **Chats per user** | Thousands | SQLite with WAL handles this fine; sidebar pagination keeps UI snappy |
| **Total memory entries** | ~10k knowledge entries + ~10k chat summaries | Cosine search is in-JS; brute-force stays under 100ms at this size |
| **Agent jobs** | 5-10 concurrent | Bounded by host CPU/memory — each agent gets 2 GB + 1 CPU by default |
| **Daily agent-job runs** | 100-500 | Depends entirely on LLM cost + docker host headroom |
| **SQLite DB size** | 10+ GB | WAL + better-sqlite3 handles multi-GB DBs without drama |
| **Projects** | Dozens | Each project is just a folder; disk is the only limit |

---

## Architecture facts that set the ceiling

**SQLite, not Postgres.** One writer process. Concurrent readers are fine, concurrent *writers* block each other briefly. For a chat app where writes come from user messages + background summaries, this is fine up to the limits above. It starts to matter when you have multiple chat streams writing messages at the same time on a hot chat.

**In-process pub/sub.** The SSE sync bus (`src/lib/sync/`) lives in one Node process. Multiple Dokploy replicas would have their own bus — users connected to replica A wouldn't see events from replica B. This rules out horizontal scaling by replica count unless you swap the bus for Redis (see below).

**In-process rate limiting.** Same story — the sliding-window store in `globalThis.__ghostbotRateLimit` is per-process. Multiple replicas = independent buckets = per-IP caps actually allow `replicas × limit` in practice.

**In-process Docker socket access.** Every replica would need its own docker-proxy sidecar, and agent containers would compete for the same host. Doesn't actually break, but the "which agent job is where?" question gets fuzzy.

**Single Ollama VPS.** Not a GhostBot architectural limit — just a deployment pattern. Ollama's load-balancing story is "run multiple hosts, round-robin the URL". You'd want to front Ollama with a proxy (HAProxy, Caddy) doing least-connections load balancing.

---

## Signals you're approaching the ceiling

Watch for these in order — the early ones surface way before the later ones:

1. **Chat responses feel slow even with a warm model.** Ollama is the bottleneck; add a second Ollama host and load-balance.
2. **Admin → Containers shows >5 concurrent agent jobs regularly.** Your host is at agent capacity. Either cut concurrency (cluster-role `maxConcurrency`) or move to a bigger VPS.
3. **SQLite file size climbing past a few GB with slower writes.** Check `data/db/ghostbot.sqlite.wal` — if it's persistently >100 MB the WAL isn't checkpointing. Heavy concurrent write load. Time to consider Postgres.
4. **The sidebar takes seconds to load on large accounts.** Not the ceiling itself — but a signal that you need to add pagination or search-by-date filters to `getChatsByUserId`. Cheap fix.
5. **You want to survive a VPS reboot without dropping chats.** SSE connections drop on restart (expected). If that's intolerable, you need replicas, which means you need Redis pub/sub.

---

## Horizontal scaling path — three migration steps

Each step is independent. Tackle them in order, stop as soon as the pain stops.

### Step 1 — Swap SSE bus for Redis pub/sub

**Where you touch code:** `src/lib/sync/bus.js` (the in-process `EventEmitter`). Replace with a Redis pub/sub client (`ioredis`). Publish to channels keyed by `userId`, subscribe per SSE connection.

**What it unlocks:** You can run N replicas of GhostBot behind a reverse proxy. Users connected to any replica see all events. Rate-limit buckets would still be per-replica — acceptable if the caps are high enough.

**Effort:** ~1 day for a solo dev. Small surface. Add `REDIS_URL` to `.env.example`, add a Redis service to `docker-compose.yml`.

### Step 2 — Swap SQLite for Postgres (or Turso)

**Why you'd do it:** Write contention from multiple concurrent hot chats, or DB size exceeding single-disk IOPS capacity, or you want multi-region replicas.

**Where you touch code:** `src/lib/db/index.js` (swap `better-sqlite3` for `pg` or `@libsql/client` for Turso). Drizzle's dialect layer handles most of the SQL compatibility — `integer timestamp` stays; `text` stays; foreign keys need an explicit constraint pass; `json` columns stay.

**Watch out for:**
- `runAutoMigrations` (the "just add a column to schema.js" convention) assumes SQLite PRAGMAs. Postgres needs proper migrations — switch to `drizzle-kit generate` + a startup migration step.
- Connection pooling: SQLite had none; Postgres needs a pool. `pg.Pool({ max: 10 })` is a reasonable start.
- Transactions: the in-process batch-insert patterns in `src/lib/memory/store.js` will need explicit `BEGIN/COMMIT` blocks.

**Effort:** 3-5 days. Mostly mechanical, some schema tweaks. Turso is easier than Postgres (SQLite-compatible with edge replication).

### Step 3 — Multiple Ollama hosts behind a load balancer

**When:** When chat latency is dominated by Ollama queueing, not network or LLM inference.

**How:** Stand up 2+ Ollama hosts with the same models pulled. Put Caddy or HAProxy in front doing least-connections routing. Update `OLLAMA_BASE_URL` in GhostBot admin to point at the LB, not an individual host.

**No GhostBot code change required.** This is purely a deployment pattern.

---

## What this repo explicitly does NOT try to do

- **Multi-region active-active.** The DB is single-primary regardless of whether it's SQLite or Postgres. Multi-region = Turso replicas + eventual consistency or full app redesign. Out of scope.
- **Serverless deploy.** GhostBot needs a long-lived Node process for SSE and the in-process pub/sub bus. Serverless platforms (Vercel Functions, AWS Lambda) are a non-fit.
- **Kubernetes-native multi-pod.** You can run it on K8s as a single pod with a PVC for SQLite. Multi-pod = you're on the Redis path above first.

---

## Practical advice

**If you're a solo developer:** You will never hit this ceiling. Run one VPS, enjoy the simplicity, never read this document again.

**If you're a 5-10 person team:** You'll be fine on one VPS. Monitor Admin → Monitoring for token usage — that tends to surprise teams more than infrastructure does.

**If you're growing past that:** Start with Step 1 (Redis bus). It's the cheapest win and fixes the most painful real-world issue (replica-unaware SSE). Step 2 (Postgres) only if SQLite genuinely hurts — most teams don't need it.

**If you're planning for hundreds of users from day one:** You're building a different product. GhostBot's architecture — single-SQLite, in-process bus, owner-admin trust model — is optimised for the single-owner / small-trusted-team use case. Stretching it past that is possible but fights the grain.

**If you just want a public "try it" page:** that's a different problem from scaling. Stand up a separate instance with `DEMO_MODE=true` (agent launches disabled, secrets no-op, daily DB reset). Demo instances don't need to scale — they're built to stay sandboxed and reset. See [DEMO.md](DEMO.md). [demo.ghostbot.dev](https://demo.ghostbot.dev) is the reference deploy.

---

## Related docs

- [SECURITY.md](../SECURITY.md) — threat model (explicitly single-tenant-trusted-admin)
- [DEMO.md](DEMO.md) — sandboxed public instance setup (different from scaling)
- [OLLAMA_QWEN_SETUP.md](OLLAMA_QWEN_SETUP.md) — Ollama VPS setup + KVM8 migration checklist
