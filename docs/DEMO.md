# Hosting a GhostBot demo instance

> **Live example:** [demo.ghostbot.dev](https://demo.ghostbot.dev) — deployed using the exact configuration in this document, co-resident with production `ghostbot.dev` on a single 16 GB Hostinger KVM.

This guide covers deploying a sandboxed GhostBot instance — a public URL where visitors can try the app without burning your LLM budget, persisting credentials, or having access to anything destructive.

## What demo mode changes

When `DEMO_MODE=true` is set in the environment, GhostBot:

- **Blocks agent-job launches** — any wrench-icon job attempt throws "Agent job launching is disabled in demo mode". Prevents runaway LLM cost and Docker host compromise.
- **No-ops secret writes** — `setConfigSecret()` silently returns. Visitors can try the admin flows, but their API keys / PATs / webhook secrets never land on disk. (Reads still work for pre-seeded config.)
- **Shows a banner** on every page explaining the restrictions.
- **Rate limiting** applies normally (inherited from the main app).

The flag is read fresh on every call, so flipping it off (for a maintenance window) and back on doesn't require a rebuild.

## Architecture

```
Internet
   │
   ▼
┌─────────────────┐       ┌──────────────────┐       ┌────────────────┐
│  ghostbot-demo  │──────▶│  ollama (1.5B)   │       │  reset-cron    │
│  DEMO_MODE=true │       │  in-compose      │       │  04:00 UTC     │
└────────┬────────┘       └──────────────────┘       └────────┬───────┘
         │                                                     │
         │  reads                                              │ wipes
         ▼                                                     ▼
   ghostbot-demo-data   ◀──────────── daily nuke ────── demo-reset.sh
```

The Ollama service ships pre-baked so visitors don't need to bring their own LLM. A small fast model (`qwen2.5-coder:1.5b` by default) runs fine on CPU — a demo doesn't need 32B quality.

## Deploying

### 1. Provision a VPS

Any 8 GB+ VPS will do. The demo doesn't run coding agents, so no docker-socket-proxy is needed — it's stripped from the demo compose.

### 2. Point DNS

```
demo.ghostbot.dev  A  <vps-ip>
```

### 3. Clone and configure

```bash
git clone https://github.com/flndrnai/ghostbot.git
cd ghostbot

cat > .env.demo <<EOF
AUTH_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
AUTH_TRUST_HOST=true
NODE_ENV=production
EOF
```

### 4. Start the stack

```bash
docker compose --env-file .env.demo -f docker-compose.demo.yml up -d
```

Three services come up:

- `ghostbot-demo` — the app itself
- `ghostbot-demo-ollama` — bundled LLM
- `ghostbot-demo-reset-cron` — alpine + crond running the daily reset

### 5. Pull the demo model into Ollama

```bash
docker exec ghostbot-demo-ollama ollama pull qwen2.5-coder:1.5b
docker exec ghostbot-demo-ollama ollama pull nomic-embed-text
```

(The memory/RAG code expects `nomic-embed-text` — without it the demo's memory features fail silently.)

### 6. Let Dokploy issue the Let's Encrypt cert

The `docker-compose.demo.yml` container joins the `dokploy-network` (external). Create a Traefik dynamic config at `/etc/dokploy/traefik/dynamic/ghostbot-demo.yml` on the Dokploy host — same pattern as Dokploy's own UI-generated routing files:

```yaml
http:
  routers:
    ghostbot-demo-router:
      rule: Host(`demo.ghostbot.dev`)
      service: ghostbot-demo-service
      middlewares: [redirect-to-https]
      entryPoints: [web]
    ghostbot-demo-router-websecure:
      rule: Host(`demo.ghostbot.dev`)
      service: ghostbot-demo-service
      entryPoints: [websecure]
      tls:
        certResolver: letsencrypt
  services:
    ghostbot-demo-service:
      loadBalancer:
        servers:
          - url: http://ghostbot-demo:3000
        passHostHeader: true
```

Traefik watches this directory and picks it up within seconds. First HTTPS request triggers the ACME HTTP-01 challenge; cert issues in ~30 seconds.

**Gotcha from the live deploy:** Traefik labels on the compose container + Dokploy's Domain config compete for the same router. Use one or the other, not both. The file-based config above is what Dokploy itself uses — simpler to hand-write.

### 7. First-admin signup

Visit `https://demo.ghostbot.dev`. The first signup becomes the demo's owner/admin — but because `DEMO_MODE=true`, nothing they configure persists anyway. Use a disposable email. The setup wizard will still run but secret-save steps no-op.

## Daily reset

The `reset-cron` sidecar runs `scripts/demo-reset.sh` every day at 04:00 UTC:

1. Wipes `data/db/`, `data/memory/`, `data/workspaces/`, `data/projects/`, `data/uploads/`
2. Restarts the `ghostbot-demo` container
3. App re-runs initial-setup logic on startup (creates empty DB, runs migrations)

Visitors who signed up during the day find themselves logged out after the reset — acceptable for a demo.

## Monitoring a public demo

Watch for:

- **Unexpected cost** — DEMO_MODE blocks agent launches but NOT chat. A popular demo can still burn Ollama CPU. Rate limiting (already in `src/proxy.js`) caps this.
- **Persistence surprises** — if you see "user X's Anthropic key was saved", the `setConfigSecret` guard regressed. Check `src/lib/db/config.js`.
- **Abuse** — the chat stream accepts any prompt. Typical threats: crypto mining via LLM, credential generation attempts. Dokploy per-IP limits + the built-in rate limiter handle most of it.

## Why not just a read-only backend?

Read-only would break the setup wizard, the admin flows, and the core "try the product" value. Blocking just the destructive/expensive paths (agent launches + secret writes) while letting everything else work gives visitors a realistic feel without the abuse surface.

## Reverting to a normal instance

Remove `DEMO_MODE=true` from the env, redeploy. Agent launches and secret writes immediately work. The banner disappears. No data migration required.
