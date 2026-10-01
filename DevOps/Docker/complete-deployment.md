# TaskForge — Production Deployment & CI/CD

How TaskForge (API + web client) is deployed, how automatic deploys work, every problem we hit while setting it up, how each was solved, and why.

| | |
|---|---|
| **Web app** | https://taskforge.cliqcrm.net |
| **API** | https://taskapi.cliqcrm.net (Swagger docs at `/docs`) |
| **Server** | `root@13.140.41.17` — Contabo VPS, Ubuntu 24.04, CyberPanel + OpenLiteSpeed |
| **Repos** | `crmdevgroup/TaskForge-api` (NestJS + Prisma), `crmdevgroup/TaskForge-client` (Next.js) |
| **Deploy method** | Docker Compose, deployed by GitHub Actions on every push to `main` |

---

## Contents

1. [Architecture](#1-architecture)
2. [What lives where](#2-what-lives-where)
3. [DNS](#3-dns)
4. [Docker setup](#4-docker-setup)
5. [OpenLiteSpeed reverse proxy](#5-openlitespeed-reverse-proxy)
6. [SSL certificates](#6-ssl-certificates)
7. [CI/CD (GitHub Actions)](#7-cicd-github-actions)
8. [Problems we faced, how we solved them, and why](#8-problems-we-faced-how-we-solved-them-and-why)
9. [Day-to-day operations (runbook)](#9-day-to-day-operations-runbook)
10. [Open items / to-do](#10-open-items--to-do)
11. [Key decisions](#11-key-decisions)

---

## 1. Architecture

```
                         Browser
                            │  HTTPS
                            ▼
              ┌──────────────────────────────┐
              │ Cloudflare DNS (grey cloud)  │  taskforge / taskapi → 13.140.41.17
              └──────────────┬───────────────┘
                             ▼
┌──────────────────────── VPS 13.140.41.17 ──────────────────────────────┐
│                                                                        │
│   OpenLiteSpeed (CyberPanel) — ports 80/443, terminates SSL            │
│     │                                                                  │
│     ├─ taskforge.cliqcrm.net ─┬─ /socket.io/*  ──────────────┐         │
│     │                         └─ everything else ─┐          │         │
│     │                                             ▼          │         │
│     │                          ┌─────────────────────────┐   │         │
│     │                          │ client (Next.js)        │   │         │
│     │                          │ 127.0.0.1:3020          │   │         │
│     │                          │ /api/v1/* is forwarded ─┼─┐ │         │
│     │                          └─────────────────────────┘ │ │         │
│     │                                 Docker network        │ │         │
│     │                                 "taskforge"           ▼ ▼         │
│     └─ taskapi.cliqcrm.net ───────────────────────► ┌──────────────┐   │
│                                                     │ api (NestJS) │   │
│                                                     │ 127.0.0.1:4000│  │
│                                                     └──────┬───────┘   │
│                                                            ▼           │
│                                                     ┌──────────────┐   │
│                                                     │ postgres:16  │   │
│                                                     │ (internal)   │   │
│                                                     └──────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

**How a request flows**

- **Normal pages** — Browser → OpenLiteSpeed → client container (`:3020`).
- **API calls** — Browser calls `https://taskforge.cliqcrm.net/api/v1/...` (its *own* domain). Next.js forwards them to `http://taskforge-api:4000` over the internal Docker network. The browser never calls `taskapi` directly, so **no CORS is needed**.
- **Live updates (Socket.IO)** — Browser connects to `https://taskforge.cliqcrm.net/socket.io/`. OpenLiteSpeed sends that path straight to the API (`:4000`), including the WebSocket upgrade.
- **`taskapi.cliqcrm.net`** — direct access to the API, for Swagger (`/docs`), testing and health checks.

---

## 2. What lives where

### On the server

| Path | What |
|---|---|
| `/opt/taskforge/TaskForge-api/` | API git clone |
| `/opt/taskforge/TaskForge-api/.env.production` | API secrets (never committed) |
| `/opt/taskforge/TaskForge-client/` | Client git clone |
| `/opt/taskforge/TaskForge-client/.env.production` | Client build settings (never committed) |
| `/usr/local/lsws/conf/vhosts/taskapi.cliqcrm.net/vhost.conf` | Proxy config for the API domain |
| `/usr/local/lsws/conf/vhosts/taskforge.cliqcrm.net/vhost.conf` | Proxy config for the client domain |
| `/etc/letsencrypt/live/<domain>/` | SSL certificates |
| `/root/.acme.sh/<domain>_ecc/` | SSL issuing/renewal settings |

### Docker containers

| Container | Image | Port | Purpose |
|---|---|---|---|
| `taskforge-api-api-1` | `taskforge-api:production` | `127.0.0.1:4000` | NestJS API |
| `taskforge-api-postgres-1` | `postgres:16` | internal only | Database (volume `taskforge-api_postgres_data`) |
| `taskforge-client-client-1` | `taskforge-client:production` | `127.0.0.1:3020` | Next.js web app |

All ports are bound to `127.0.0.1`, so they are **not reachable from the internet** — only through OpenLiteSpeed over HTTPS.

### Files added to the repos

**TaskForge-api**

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage build. `runtime` target = the API; `migration` target = runs `prisma migrate deploy` |
| `.dockerignore` | Keeps `node_modules`, `.env*`, `.git` etc. out of the image |
| `deploy/compose.production.yml` | Postgres + API + one-off `migrate` service; creates the shared `taskforge` network |
| `.env.production.example` | Template for the server's `.env.production` |
| `.github/workflows/ci-cd.yml` | CI (lint/build/test) + automatic deploy |

**TaskForge-client**

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage Next.js standalone build |
| `.dockerignore` | Same idea as the API |
| `deploy/compose.production.yml` | Client container, joins the external `taskforge` network |
| `.env.production.example` | Template for the client's build settings |
| `.github/workflows/ci-cd.yml` | CI (lint/build) + automatic deploy |
| `next.config.ts` | Added `output: "standalone"` for a small self-contained Docker image |

---

## 3. DNS

The domain `cliqcrm.net` is **registered at Hostinger**, but its **nameservers point to Cloudflare** (`alex.ns.cloudflare.com`, `sofia.ns.cloudflare.com`). So **all DNS records must be added in Cloudflare** — records added in Hostinger's DNS panel are ignored.

| Type | Name | Value | Proxy |
|---|---|---|---|
| A | `taskapi` | `13.140.41.17` | **DNS only (grey cloud)** |
| A | `taskforge` | `13.140.41.17` | **DNS only (grey cloud)** |

Keep them **grey**. Let's Encrypt's HTTP check needs to reach the server directly. If you ever switch to the orange cloud, set Cloudflare **SSL/TLS → Full (strict)**.

Check:
```bash
dig +short taskapi.cliqcrm.net taskforge.cliqcrm.net    # both → 13.140.41.17
```

---

## 4. Docker setup

### API settings — `/opt/taskforge/TaskForge-api/.env.production`

| Variable | Value / note |
|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Credentials for the Postgres container. **Must match `DATABASE_URL`** |
| `DATABASE_URL` | `postgresql://taskforge:<password>@postgres:5432/taskforge` — host is **`postgres`** (the service name), not `localhost` |
| `BETTER_AUTH_SECRET` | Long random string (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | **`https://taskforge.cliqcrm.net`** — the *client's* domain (see Problem 4) |
| `REALTIME_ALLOWED_ORIGINS` | `https://taskforge.cliqcrm.net` |
| `FRONTEND_URL` | `https://taskforge.cliqcrm.net` — used in invite emails. **Required** |
| `SMTP_*` | Email sending (verification + invites) via **Hostinger mail**: `SMTP_HOST=smtp.hostinger.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USER`/`SMTP_FROM` = the same `@cliqcrm.net` mailbox. Hostinger is where `cliqcrm.net`'s MX, SPF and DKIM point — mail sent from the VPS's own mail server would fail SPF/DMARC and land in spam |
| `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | File attachments. **All required** |
| `GOOGLE_*`, `GITHUB_*` | Optional OAuth |

`NODE_ENV=production` and `PORT=4000` are forced by the compose file.

### Client settings — `/opt/taskforge/TaskForge-client/.env.production`

```bash
TASKFORGE_API_URL=http://taskforge-api:4000
NEXT_PUBLIC_REALTIME_URL=https://taskforge.cliqcrm.net
```

Both are **baked in at build time** (Next.js compiles rewrites and `NEXT_PUBLIC_*` into the build). Changing them requires a **rebuild**, not just a restart — a normal deploy rebuilds.

### Shared network

The API compose file creates a Docker network named **`taskforge`** and gives the API the alias **`taskforge-api`** on it. The client compose file joins that network as `external`. That's how the client reaches `http://taskforge-api:4000` without going through the internet.

➡️ **Always deploy the API before the client** on a fresh server — the client can't start until the network exists.

---

## 5. OpenLiteSpeed reverse proxy

CyberPanel creates a `vhost.conf` per website. We add proxy rules to it.

> ⚠️ **Rule:** a `vhost.conf` may contain **only one `rewrite { }` block**. CyberPanel already creates one (with "sensitive-file denials"). Add your rules **inside that block**, just above `END_rules`. A second `rewrite` block is silently ignored.

### `taskapi.cliqcrm.net`

Inside CyberPanel's existing `rewrite` block, after `# END CyberPanel sensitive-file denials`:
```
RewriteCond %{REQUEST_URI} !^/\.well-known/acme-challenge/
RewriteRule ^(.*)$ http://taskforgeapi/$1 [P,L]
```
At the bottom of the file:
```
extprocessor taskforgeapi {
  type                    proxy
  address                 127.0.0.1:4000
  maxConns                100
  initTimeout             60
  retryTimeout            0
  respBuffer              0
}

websocket /socket.io/ {
  address                 127.0.0.1:4000
}
```

### `taskforge.cliqcrm.net`

Inside the existing `rewrite` block:
```
RewriteCond %{REQUEST_URI} ^/socket\.io/
RewriteRule ^(.*)$ http://taskforgeapi/$1 [P,L]
RewriteCond %{REQUEST_URI} !^/\.well-known/acme-challenge/
RewriteRule ^(.*)$ http://taskforgeclient/$1 [P,L]
```
At the bottom of the file:
```
extprocessor taskforgeclient {
  type                    proxy
  address                 127.0.0.1:3020
  maxConns                100
  initTimeout             60
  retryTimeout            0
  respBuffer              0
}

extprocessor taskforgeapi {
  type                    proxy
  address                 127.0.0.1:4000
  maxConns                100
  initTimeout             60
  retryTimeout            0
  respBuffer              0
}

websocket /socket.io/ {
  address                 127.0.0.1:4000
}
```

After any change:
```bash
grep -c "^rewrite" /usr/local/lsws/conf/vhosts/<domain>/vhost.conf   # must print 1
systemctl restart lsws
```

The `!^/\.well-known/acme-challenge/` condition keeps SSL renewal working — Let's Encrypt's check files are served by OpenLiteSpeed itself instead of being forwarded to the app.

---

## 6. SSL certificates

Certificates are from **Let's Encrypt**, issued and auto-renewed by **acme.sh** (`/root/.acme.sh`). A cron job (`7 0 * * *`) renews them automatically.

> ⚠️ **Do not click "Issue SSL" in CyberPanel for these two domains.** CyberPanel saved them with Let's Encrypt's *staging* (test) server and would replace the real certificate with an untrusted one (see Problem 8).

To (re)issue a certificate manually:
```bash
d=taskforge.cliqcrm.net   # or taskapi.cliqcrm.net
/root/.acme.sh/acme.sh --issue -d $d -w /usr/local/lsws/Example/html --server letsencrypt --keylength ec-256 --force \
  --cert-file /etc/letsencrypt/live/$d/cert.pem \
  --key-file /etc/letsencrypt/live/$d/privkey.pem \
  --fullchain-file /etc/letsencrypt/live/$d/fullchain.pem \
  && systemctl restart lsws
```

Check which certificate is live:
```bash
echo | openssl s_client -connect taskforge.cliqcrm.net:443 -servername taskforge.cliqcrm.net 2>/dev/null | openssl x509 -noout -issuer -enddate
# Good:  issuer=C=US, O=Let's Encrypt, CN=YE1        (no "STAGING", no "Springfield")
```

---

## 7. CI/CD (GitHub Actions)

Both repos have `.github/workflows/ci-cd.yml`.

| Event | What happens |
|---|---|
| Pull request | **check** job only — nothing is deployed |
| Push to `main` | **check** job → if green → **deploy** job |
| Check fails | Nothing is deployed; the live site keeps running the previous version |
| Deploy's health check fails | Job turns red and prints the container's last 100 log lines |

**check job**
- API: `npm ci` → `npm run lint` → `npm run build` → `npm test`
- Client: `npm ci` → `npm run lint` → `npm run build`

**deploy job** (SSH into the server with `appleboy/ssh-action`)
- API: `git fetch` + `git reset --hard origin/main` → build images → **run database migrations** → restart API → wait for `http://127.0.0.1:4000/` to answer
- Client: `git fetch` + `git reset --hard origin/main` → build → restart → wait for `http://127.0.0.1:3020/login` to answer
- Old images are pruned after a successful deploy.

`git reset --hard` does **not** touch `.env.production` — it's untracked and git-ignored.

### Secrets

Each repo needs these **repository secrets** (Settings → Secrets and variables → Actions → **Repository secrets**):

| Secret | Value |
|---|---|
| `DEPLOY_HOST` | `13.140.41.17` |
| `DEPLOY_USER` | `root` |
| `DEPLOY_SSH_KEY` | Full private key, all lines including `-----BEGIN…` and `-----END…` |

> Organization secrets **do not work** on our GitHub plan for private repos (see Problem 11).

### The two SSH keys (easy to mix up)

| Key | Direction | Where the private part lives | Where the public part lives |
|---|---|---|---|
| Server's GitHub key (`/root/.ssh/id_ed25519`) | Server → GitHub (to `git fetch`) | Server | GitHub account |
| Deploy key (`taskforge_actions`) | GitHub Actions → Server (to log in and deploy) | GitHub secret `DEPLOY_SSH_KEY` | Server's `/root/.ssh/authorized_keys` |

**Rule of thumb: private key → GitHub secret, public key → server.**

---

## 8. Problems we faced, how we solved them, and why

In the order we hit them.

### Problem 1 — `compose.production.yml: no such file or directory`
- **Symptom:** First manual start on the server failed immediately.
- **Cause:** The repo was cloned on the server **before** the new Docker/CI files were pushed to GitHub, so the clone didn't have them.
- **Fix:** Pushed the files, then `git pull` on the server.
- **Why it matters:** The server only ever runs what's on GitHub `main`. Anything only on your laptop doesn't exist there.

### Problem 2 — `dependency failed to start: container taskforge-api-postgres-1 is unhealthy`
- **Symptom:** Postgres kept restarting. Log: *"Database is uninitialized and superuser password is not specified."*
- **Cause:** `.env.production` was copied from the development `.env.example`, which has no `POSTGRES_USER/PASSWORD/DB`. Also `DATABASE_URL` pointed to `localhost:5432/task_management_global`.
- **Fix:** Added `POSTGRES_USER=taskforge`, a generated `POSTGRES_PASSWORD`, `POSTGRES_DB=taskforge`, and changed `DATABASE_URL` to `postgresql://taskforge:<password>@postgres:5432/taskforge`.
- **Why:** The official Postgres image refuses to create a database without a password. Inside Docker, `localhost` means "this container" — the API must reach the database by its **service name `postgres`**.

### Problem 3 — `AWS_S3_BUCKET` missing
- **Cause:** Not in the copied env file.
- **Fix:** Added it.
- **Why:** The API validates all required env vars at startup (`src/env.validation.ts`) and refuses to start if one is missing. Better to fail fast than break later on the first upload.

### Problem 4 — `BETTER_AUTH_URL` pointed to the API domain
- **Cause:** Natural assumption that the auth URL is the API's URL.
- **Fix:** `BETTER_AUTH_URL=https://taskforge.cliqcrm.net` (the **client** domain).
- **Why:** The browser never talks to `taskapi` — it calls `/api/v1/*` on the client's domain and Next.js forwards it. Better Auth only trusts requests whose `Origin` equals `BETTER_AUTH_URL`, and email verification links / OAuth callbacks are built from it. Both must be the domain the user actually sees.

### Problem 5 — Live updates would never authenticate (found during design)
- **Cause:** Socket.IO authenticates with the login **cookie**. That cookie belongs to `taskforge.cliqcrm.net`. A socket opened to `taskapi.cliqcrm.net` would be sent without it.
- **Fix:** `NEXT_PUBLIC_REALTIME_URL=https://taskforge.cliqcrm.net`, and OpenLiteSpeed sends `/socket.io/` on that domain straight to the API (with WebSocket support).
- **Why:** Same-origin means the browser automatically includes the cookie. No code change was needed.

### Problem 6 — Client → API path
- **Cause:** The client was first configured with `TASKFORGE_API_URL=https://taskapi.cliqcrm.net`.
- **Fix:** `TASKFORGE_API_URL=http://taskforge-api:4000` over the shared `taskforge` Docker network.
- **Why:** The public URL works, but every API call would leave the server, go through DNS + SSL + OpenLiteSpeed, and come back. The internal network is faster and doesn't depend on SSL or DNS being healthy.

### Problem 7 — Port 3000 already taken
- **Cause:** Another app on the server already uses `127.0.0.1:3000`.
- **Fix:** Client runs on `127.0.0.1:3020`.

### Problem 8 — Browser says "Not secure" (three rounds)
1. **Self-signed certificate ("O=Dis, L=Springfield").** SSL was issued in CyberPanel **before** the DNS records existed. Let's Encrypt couldn't verify the domain, so CyberPanel silently installed a self-signed certificate. *Lesson: DNS first, then SSL.*
2. **Let's Encrypt STAGING certificate.** After DNS was fixed, re-issuing in CyberPanel still produced untrusted certificates. Investigation showed CyberPanel had saved both domains in acme.sh with `Le_API='https://acme-staging-v02...'` — the **test** server. Every "Issue SSL" click "renewed" against staging. It even replaced the good `taskapi` certificate.
3. **Fix:** Issued directly with `acme.sh --server letsencrypt --force`. This produced trusted certificates **and** rewrote the saved setting to the production server, so the daily auto-renewal now stays on production.
- **Why it matters:** Don't use CyberPanel's "Issue SSL" for these domains; use the acme.sh command in [section 6](#6-ssl-certificates).

### Problem 9 — Proxy not working: "CyberPanel Installed" page
- **Symptom:** `https://taskapi.cliqcrm.net` showed CyberPanel's placeholder page instead of the API.
- **Cause:** The proxy rules were pasted as a **second** `rewrite` block. OpenLiteSpeed only uses one, so it used CyberPanel's default and ignored ours. During cleanup, the wrong block was deleted along with the `extprocessor`/`websocket` blocks.
- **Fix:** One `rewrite` block containing both CyberPanel's denials **and** our proxy rules; `extprocessor` + `websocket` blocks at the bottom. Applied with tested `sed` commands and `.bak` backups.
- **Why:** See the rule in [section 5](#5-openlitespeed-reverse-proxy).

### Problem 10 — Secrets could be committed by accident
- **Cause:** The API's `.gitignore` ignored `.env` but **not** `.env.production`. A `git add .` on the server or a laptop could have pushed production passwords to GitHub.
- **Fix:** Added `.env.production` and `.env.production.*` to `.gitignore` (keeping `.env.production.example` tracked). In the client, the opposite: `.env*` was ignored, so `!.env.production.example` was added to keep the template tracked.

### Problem 11 — CI: `Error: missing server host`
- **Cause:** The secrets were added as **organization secrets**. On our GitHub plan, organization secrets **cannot be used by private repositories** (GitHub shows: *"Organization secrets can only be used by public repositories on your plan"*). The workflow received empty values.
- **Fix:** Added the same three secrets as **repository secrets** in each repo.

### Problem 12 — CI: `ssh: no key found` / `unable to authenticate`
Two problems hidden behind each other:
1. **Key created on the laptop, not the server.** `cat ~/.ssh/taskforge_actions.pub >> ~/.ssh/authorized_keys` was run on the laptop, so the public key went into the **laptop's** `authorized_keys`. The server didn't know it.
   **Fix:** `ssh-copy-id -i ~/.ssh/taskforge_actions.pub root@13.140.41.17`, and removed the line from the laptop's `authorized_keys`.
2. **Secret pasted incompletely.** `no key found` means GitHub couldn't parse the value.
   **Fix:** Opened the key in VS Code, `Ctrl+A` → `Ctrl+C`, pasted all 7 lines (including `BEGIN`/`END`).
- **Test that proves the server side works:**
  ```bash
  ssh -i ~/.ssh/taskforge_actions -o IdentitiesOnly=yes root@13.140.41.17 "echo key works"
  ```

### Problem 13 — CI: Docker build failed `No files matching the pattern were found: "test/**/*.ts"`
- **Cause:** A later commit added `"prebuild": "npm run format && npm run test"` to the API's `package.json`. npm runs `prebuild` automatically before **every** `npm run build` — including inside the Docker build. The image only contains `src/`, not `test/`, so Prettier failed.
- **Fix:** The Dockerfile now runs `npx nest build` directly, which skips the `prebuild` hook.
- **Why it's safe:** Tests still run in the CI **check** job before any deploy, and the husky pre-push hook still formats + tests locally. Formatting/testing inside an image build doesn't belong there anyway.

### Problem 14 — Login fails: `403 {"message":"Invalid origin","code":"INVALID_ORIGIN"}`
- **Symptom:** Every sign-in on https://taskforge.cliqcrm.net returned 403. API log: `Invalid origin: https://taskforge.cliqcrm.net, https://taskforge.cliqcrm.net`.
- **Investigation:** Tested each hop on the server:

  | Path | Result |
  |---|---|
  | API directly (`127.0.0.1:4000`) | ✅ works |
  | Client container directly (`127.0.0.1:3020`) | ✅ works |
  | Through OpenLiteSpeed (`https://…`) | ❌ `INVALID_ORIGIN` |

- **Cause:** OpenLiteSpeed's reverse proxy forwards the `Origin` header **twice**. Node.js joins duplicates into `"https://a, https://a"`, which doesn't equal `BETTER_AUTH_URL`, so Better Auth rejects it. It looks like CORS, but it isn't — configuration was correct.
- **Fix (API, `src/app-bootstrap.ts`):** A small middleware `collapseDuplicateOrigin` runs **before** Better Auth and collapses the header back to one value — **only when all copies are identical**. A request with genuinely different origins is still rejected. Covered by 4 unit tests (`src/app-bootstrap.spec.ts`), and verified with a real container sending two `Origin` headers.
- **Why fix it in the API and not the proxy:** OpenLiteSpeed has no clean way to strip request headers on a proxy rule. Fixing it in the API works behind any proxy.

### Problem 15 — New required setting `FRONTEND_URL`
- **Cause:** Commit `83562b0` (invite emails) made `FRONTEND_URL` required. The server's `.env.production` didn't have it. The next deploy would have started an API that **refuses to boot**, taking the site down.
- **Fix:** Add `FRONTEND_URL=https://taskforge.cliqcrm.net` to the server's `.env.production` **before** pushing. Also documented in `.env.production.example`.
- **Lesson:** Whenever a commit adds a required env var, add it on the server **before** pushing to `main`.

### Problem 16 — Prisma config file name
- **Cause:** The project's Prisma config is `prisma7.config.ts`, not the default `prisma.config.ts`. Prisma wouldn't find the database URL for migrations.
- **Fix:** The migration image runs `prisma migrate deploy --config prisma7.config.ts`.

---

## 9. Day-to-day operations (runbook)

Shortcuts used below (run on the server):
```bash
API="docker compose --env-file .env.production -f deploy/compose.production.yml"   # in /opt/taskforge/TaskForge-api
CLI="docker compose --env-file .env.production -f deploy/compose.production.yml"   # in /opt/taskforge/TaskForge-client
```

### Deploy
Just push to `main`. Watch **GitHub → repo → Actions**.

### Manual deploy (if Actions is down)
```bash
cd /opt/taskforge/TaskForge-api
git fetch origin main && git reset --hard origin/main
$API build api migrate && $API run --rm migrate && $API up -d api

cd /opt/taskforge/TaskForge-client
git fetch origin main && git reset --hard origin/main
$CLI up -d --build client
```

### Status & logs
```bash
docker ps --filter name=taskforge
docker logs --tail=100 -f taskforge-api-api-1
docker logs --tail=100 -f taskforge-client-client-1
curl http://127.0.0.1:4000/          # API health
curl -I http://127.0.0.1:3020/login  # client health
```

### Changed `.env.production`?
```bash
cd /opt/taskforge/TaskForge-api && $API up -d --force-recreate api       # API: restart is enough
cd /opt/taskforge/TaskForge-client && $CLI up -d --build client          # client: needs a rebuild
```

### Roll back to a previous version
```bash
cd /opt/taskforge/TaskForge-api
git log --oneline -10                 # pick the last good commit
git reset --hard <commit-sha>
$API build api && $API up -d api
```
Then fix or revert the bad commit on GitHub — the next push to `main` deploys whatever `main` is.
> Database migrations are **not** rolled back automatically. If the bad version included a migration, check it before rolling back.

### Database
```bash
cd /opt/taskforge/TaskForge-api
$API exec postgres psql -U taskforge taskforge                                      # SQL shell
$API exec -T postgres pg_dump -U taskforge taskforge | gzip > ~/taskforge-$(date +%F).sql.gz   # backup
gunzip -c ~/taskforge-YYYY-MM-DD.sql.gz | $API exec -T postgres psql -U taskforge taskforge     # restore
```

### Proxy / SSL
```bash
systemctl restart lsws
tail -f /usr/local/lsws/logs/error.log
```

---

## 10. Open items / to-do

| Priority | Item | Why |
|---|---|---|
| 🔴 Now | Add `FRONTEND_URL=https://taskforge.cliqcrm.net` to the server's API `.env.production`, **then** push the 2 pending API commits (Docker build fix + login fix) | Login is broken until the fix is deployed; the API won't boot without `FRONTEND_URL` |
| 🔴 High | Fix login rate limiting | Behind the proxy, the API can't see each user's IP, so **all users share one rate limit** — a few sign-ins in a row from different people block everyone briefly. Fix: configure Better Auth's `advanced.ipAddress` to read `X-Forwarded-For` |
| 🔴 High | Remove the stray **private** key pasted into the server's `/root/.ssh/authorized_keys` (`-----BEGIN PRIVATE…`) and rotate that key if it's used anywhere | A private key should never sit on a server in plain text |
| 🟠 Medium | Rotate the GitHub Actions deploy key (`taskforge_actions`) | Its contents were shared in chat while setting up |
| 🟠 Medium | Nightly database backup to S3 | There is currently no backup |
| 🟡 Low | Limit Docker log size (`/etc/docker/daemon.json` → `"log-opts": {"max-size": "10m", "max-file": "3"}`) | Prevent logs from filling the disk |
| 🟡 Low | Uptime monitoring (UptimeRobot / Better Stack) on both domains | Know about outages before users do |
| 🟡 Low | In CI, run `prettier --check` instead of letting `prebuild` rewrite files, and run tests once | Tests currently run twice in CI; formatting issues aren't caught |

---

## 11. Key decisions

| Decision | Reason |
|---|---|
| **Docker Compose, not Kubernetes** | One server. Compose + `restart: unless-stopped` already restarts crashed containers. k3s would fight CyberPanel for ports 80/443, use ~0.5–1 GB RAM, and add a lot of maintenance. Revisit when moving to 2+ servers or needing autoscaling |
| **Follow the existing server pattern** (`leadgen`, `brochuremarket`) | Same structure: Docker bound to `127.0.0.1`, OpenLiteSpeed in front, GitHub Actions → SSH → `git reset` → `compose up --build` |
| **Build images on the server** (no registry) | Simplest setup; no registry to pay for or secure. Trade-off: builds use server CPU for a few minutes |
| **Own Postgres container** for TaskForge | Isolated from the other apps' databases; easy to back up and move |
| **Browser only talks to `taskforge.cliqcrm.net`** | No CORS needed, cookies just work, one domain for users. `taskapi` is for direct/admin access |
| **Migrations run automatically on every API deploy** | Schema always matches the code that's running. `prisma migrate deploy` only applies new, committed migrations |
| **Health check after each deploy** | A broken release turns the GitHub job red with logs, instead of failing silently |
