# Ollama + Qwen 2.5 Coder Setup for GhostBot

This guide walks through running **Qwen 2.5 Coder** on a self-hosted Ollama instance and connecting GhostBot to it. It is the recommended setup for the GhostBot reference deployment (cost-effective, fully self-hosted, no per-token fees).

---

## 1. Why Qwen 2.5 Coder

| Aspect | Notes |
|---|---|
| Specialty | Trained specifically for code generation, completion, repair, reasoning |
| Sizes | 0.5B, 1.5B, 3B, 7B, 14B, **32B** (recommended for VPS), 72B |
| License | Apache 2.0 — commercial use OK |
| Context | 32K tokens (128K extended) |
| Format | OpenAI-compatible API via Ollama → drops straight into GhostBot |

For a single-user GhostBot on a VPS with 24–32 GB RAM and a modern CPU (or any GPU), **`qwen2.5-coder:32b`** is the sweet spot. For 16 GB RAM, drop to `qwen2.5-coder:14b`. For weak hardware, use `qwen2.5-coder:7b`.

---

## 2. VPS Requirements

| Model | Min RAM | Recommended RAM | Disk | GPU |
|---|---|---|---|---|
| 7B | 8 GB | 16 GB | 5 GB | optional |
| 14B | 16 GB | 24 GB | 9 GB | optional |
| **32B** | 24 GB | 32 GB | 20 GB | strongly recommended |
| 72B | 64 GB | 96 GB | 45 GB | required |

**CPU-only is viable** for 7B/14B. For 32B without a GPU, expect 5–15 tokens/sec — fine for single-user chat, slow for long generations.

---

## 3. Install Ollama on the VPS

SSH into your VPS as root (or a sudoer):

```bash
ssh root@<your-vps-ip>
curl -fsSL https://ollama.com/install.sh | sh
```

Verify:

```bash
systemctl status ollama
ollama --version
```

By default Ollama binds to `127.0.0.1:11434`. GhostBot needs to reach it from the application server (or the public internet, if GhostBot runs elsewhere). Choose **one** of the two options below.

### Option A — Same machine (GhostBot + Ollama on the same VPS)

Nothing to change. Use `http://127.0.0.1:11434` as the URL in GhostBot. **This is the most secure option.**

### Option B — Remote (GhostBot on a different host)

You must expose Ollama on the network interface. Edit the systemd unit:

```bash
sudo systemctl edit ollama
```

Add:

```ini
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
Environment="OLLAMA_ORIGINS=*"
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

**⚠️ Security:** A public `0.0.0.0` Ollama with no auth is an open compute API. Lock it down:

1. **Firewall to GhostBot's IP only:**
   ```bash
   ufw allow from <ghostbot-server-ip> to any port 11434
   ufw deny 11434
   ```
2. **Or put it behind a reverse proxy** (Caddy/Traefik/Nginx) with basic auth or mTLS.
3. **Or use a private network** (Tailscale, WireGuard, cloud VPC).

Never expose Ollama publicly without one of the above.

---

## 4. Pull Qwen 2.5 Coder

```bash
ollama pull qwen2.5-coder:32b
```

This downloads ~20 GB. Once done:

```bash
ollama list
ollama run qwen2.5-coder:32b "Write a Python function that reverses a string"
```

If it generates code, you're good.

### Optional: tag a smaller variant for fallback

```bash
ollama pull qwen2.5-coder:7b
```

You can switch between them in the GhostBot admin UI without restarting anything.

---

## 5. Connect GhostBot

1. Open GhostBot → **Admin → Ollama Setup**.
2. Enter the URL:
   - Same-machine: `http://127.0.0.1:11434`
   - Remote: `http://<vps-ip>:11434`
   - Behind a domain: `https://ollama.example.com`
3. Click **Test Connection**. The status badge turns green and the model dropdown auto-populates from `/api/tags`.
4. Click **Save**. The card border locks in green ("Connected to Ollama").
5. In the model list below, click **Set Active** next to `qwen2.5-coder:32b`.
6. Open a new chat and send a message. You should see streaming tokens within a few seconds.

GhostBot strips trailing slashes from the URL and reads the config fresh on every request, so a re-save takes effect on the very next message — no restart needed.

---

## 6. Tuning

In **Admin → LLM Providers → Chat Settings**:

| Setting | Suggested for Qwen Coder 32B |
|---|---|
| `MAX_TOKENS` | `4096` (raise to `8192` for long files) |
| `TEMPERATURE` | `0.2` for code, `0.7` for general chat |
| `SYSTEM_PROMPT` | Keep terse — Qwen Coder responds well to direct instructions |

Ollama-side performance flags (set in the systemd unit if needed):

```ini
Environment="OLLAMA_NUM_PARALLEL=2"      # concurrent requests
Environment="OLLAMA_MAX_LOADED_MODELS=2" # keep 32B + 7B both warm
Environment="OLLAMA_KEEP_ALIVE=30m"      # how long the model stays in RAM
```

Restart after changes: `sudo systemctl restart ollama`.

---

## 7. Verifying End-to-End

```bash
# 1. Ollama is up
curl http://127.0.0.1:11434/api/tags | jq '.models[].name'

# 2. Model responds
curl http://127.0.0.1:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-coder:32b",
    "messages": [{"role":"user","content":"say hi"}],
    "stream": false
  }'

# 3. GhostBot can reach it (from the GhostBot server)
curl http://<ollama-host>:11434/api/tags
```

If all three return data and GhostBot's "Test Connection" button is green, chat will work.

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "Cannot connect to LLM" in chat | URL wrong, firewall, Ollama bound to 127.0.0.1 | Re-check Section 3, run the curls in Section 7 |
| Test Connection green but chat hangs | Model not selected as active | Admin → Ollama Setup → click **Set Active** next to the model |
| Chat works once, then breaks until restart | (Fixed in current build) Was caused by a stale cached agent. Pull latest. | — |
| Slow first token, then OK | Ollama is loading the model into RAM/VRAM | Increase `OLLAMA_KEEP_ALIVE` so it stays warm |
| `model not found` | Model wasn't pulled | `ollama pull qwen2.5-coder:32b` |
| Out of memory crash | Model too big for available RAM | Drop to `qwen2.5-coder:14b` or `:7b` |
| Trailing-slash double-`//` errors | (Fixed) GhostBot now strips trailing slashes server-side | — |
| Docker GhostBot can't reach host Ollama | `localhost` inside container ≠ host | Use `http://host.docker.internal:11434` (Docker Desktop) or the host's LAN IP |

---

## 9. Reference Architecture

```
┌─────────────────────────┐         ┌──────────────────────────┐
│  GhostBot (Next.js 16)  │  HTTPS  │  Ollama on VPS           │
│  ghostbot.dev           │ ──────> │  qwen2.5-coder:32b       │
│  /stream/chat ──────────│         │  /v1/chat/completions    │
│  reads OLLAMA_BASE_URL  │         │  port 11434              │
│  fresh per request      │         │                          │
└─────────────────────────┘         └──────────────────────────┘
```

- GhostBot uses Ollama's **OpenAI-compatible** endpoint (`/v1/...`) via LangChain `ChatOpenAI`.
- Model is built fresh per request → admin changes apply on the next message, no restart.
- No tool-calling overhead in the plain chat path → reliable streaming on Qwen.

---

## 10. Cost Comparison

| Setup | Up-front | Monthly | Per-token cost |
|---|---|---|---|
| Mac Studio M2 Ultra (192 GB) | ~€6,000 | electricity | 0 |
| Hetzner CCX33 + Qwen 32B | €0 | ~€60 | 0 |
| Anthropic Claude API | €0 | usage-based | high |
| OpenAI GPT-4o API | €0 | usage-based | high |

For a personal coding agent that runs 24/7, self-hosted Qwen 2.5 Coder on a €60/month VPS pays for itself within the first week of moderate usage.

---

## 11. Migration Checklist — Switching to a Separated KVM8 VPS

When moving Ollama off the current shared VPS onto a dedicated KVM8 box (Ollama-only host, GhostBot stays where it is), follow this in order. Estimated downtime: **~10 minutes** for the GhostBot chat (only during the URL switch).

### Pre-flight (do BEFORE touching anything)

- [ ] Note the **current** Ollama URL from GhostBot → Admin → Ollama Setup
- [ ] Note the **current active model name** (e.g. `qwen2.5-coder:32b`)
- [ ] Confirm KVM8 specs: ≥24 GB RAM, ≥40 GB free disk, Ubuntu 22.04+/Debian 12+
- [ ] Have root SSH access to the new KVM8 ready
- [ ] Have the new KVM8's public IP and (if applicable) its private network IP

### Step 1 — Provision Ollama on the new KVM8

```bash
ssh root@<new-kvm8-ip>

# Install
curl -fsSL https://ollama.com/install.sh | sh

# Bind to all interfaces (since GhostBot is on a different host)
sudo systemctl edit ollama
```

Paste:
```ini
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
Environment="OLLAMA_ORIGINS=*"
Environment="OLLAMA_KEEP_ALIVE=30m"
Environment="OLLAMA_NUM_PARALLEL=2"
```

```bash
sudo systemctl daemon-reload
sudo systemctl restart ollama
sudo systemctl status ollama   # should be active (running)
```

### Step 2 — Lock down the firewall (CRITICAL)

```bash
# Allow only the GhostBot server to talk to Ollama
ufw allow from <ghostbot-server-ip> to any port 11434 proto tcp
ufw allow OpenSSH
ufw enable
ufw status
```

Verify from a third machine (NOT the GhostBot host) that port 11434 is **closed**:
```bash
nc -zv <new-kvm8-ip> 11434   # should fail
```

Then verify from the GhostBot host that it **succeeds**:
```bash
ssh root@<ghostbot-server-ip>
curl http://<new-kvm8-ip>:11434/api/tags   # should return {"models":[]}
```

### Step 3 — Pull the model on the new KVM8

```bash
ssh root@<new-kvm8-ip>
ollama pull qwen2.5-coder:32b
ollama list                                       # confirm size + name
ollama run qwen2.5-coder:32b "say ready"          # smoke test, then Ctrl+D
```

This is the slow part (~20 GB download). Do it **before** the switch so you're not racing the clock.

### Step 4 — Pre-warm the model

```bash
curl http://<new-kvm8-ip>:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen2.5-coder:32b","messages":[{"role":"user","content":"hi"}],"stream":false}'
```

You want the model loaded into RAM **before** GhostBot starts hitting it, so the first real chat message doesn't time out.

### Step 5 — Switch GhostBot over

1. GhostBot → **Admin → Ollama Setup**
2. Change URL to: `http://<new-kvm8-ip>:11434`
3. Click **Test Connection** → status badge must turn green
4. Click **Save**
5. In the model list, click **Set Active** next to `qwen2.5-coder:32b`
6. Open a new chat → send `hello` → confirm streaming works

GhostBot reads the URL fresh on every request, so no restart, no redeploy.

### Step 6 — Verify and decommission the old Ollama

- [ ] Run 3–5 real chat messages, including a code-generation prompt
- [ ] Check `/admin/llms` still shows green
- [ ] Check Hetzner/cloud bandwidth on the new KVM8 — initial requests should show traffic
- [ ] Wait 24 hours of normal use
- [ ] If stable: stop the old Ollama on the previous VPS:
  ```bash
  ssh root@<old-vps-ip>
  sudo systemctl stop ollama
  sudo systemctl disable ollama
  # (Keep the binary and model files for 1 week as a fallback before removing)
  ```

### Rollback plan

If anything goes wrong on the new KVM8, the old VPS Ollama is still running and GhostBot is one URL change away from being back. Just revert step 5 and click Save.

### Optional — DNS-based switching

If you point a subdomain (e.g. `ollama.ghostbot.dev`) at whichever box is current, future migrations are even smoother — no GhostBot config change at all, just a DNS flip. Recommended once you're stable.

---

**Last updated:** 2026-04-07
