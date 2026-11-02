# Dropbox Automation — VPS Deployment

How this app is connected to, checked, and updated on the live server.
(This repo is public — **no passwords in this file**. They are in the private
`../Dropbox Automation/VPS_Migration_Guide.md`, which is not in git.)

---

## The live setup

| What | Value |
|---|---|
| Live site | https://blurr-dropbox-automation.particle-creative.cloud/ |
| Server | Shared Hostinger VPS `76.13.2.74` (Ubuntu), hostname `particle` |
| Login user | `root` (the `deploy` user can't write to `/var/www` or run docker) |
| App folder on server | `/var/www/dropbox-automation` |
| Docker container | `dropbox-automation-app-1` |
| Port | `3005` on the server → `3000` inside the container |
| Nginx site file | `/etc/nginx/sites-enabled/blurr-dropbox-automation` (proxies to `localhost:3005`) |
| Code comes from | GitHub `alonkatzParticle/Dropbox_Universal`, branch `main` |

⚠️ **This is a shared server.** Other apps live next to this one (brief-writer,
slack-summary, ppd-board, dam, qa, particleproductionsio…). In particular,
`/var/www/particle-dropbox-automation` (port 3006) is a **different app** — don't touch it.
Never run `docker system prune` or `docker compose down` outside this app's folder.

---

## Day-to-day: the `vps.py` helper

Run from the project root on your Mac. Settings come from the `VPS_*` lines in `.env`
(see `.env.example`). SSH asks for the root password once per run.

```bash
python3 vps.py          # STATUS — read-only. Proves you're on the right server
                        # (hostname, IP, user), lists projects, containers,
                        # nginx web addresses, and whether this app answers.

python3 vps.py deploy   # DEPLOY — git pull on the server, rebuild, restart,
                        # then checks the app answers.
```

### Deploying a change

1. Commit and push to `main` on GitHub.
2. `python3 vps.py deploy`
3. Takes about 1–2 minutes (the Docker build is ~1 min). The old version keeps
   serving until the new container starts, so the site doesn't go down.
4. Check the site. If the browser still shows the old version, hard-refresh (Cmd+Shift+R).

**Pushing to GitHub alone does NOT update the site** (that was Vercel's behaviour).
Step 2 is always needed.

### What `deploy` does on the server

```bash
cd /var/www/dropbox-automation
git config --global --add safe.directory /var/www/dropbox-automation  # root vs file-owner
cp logs.json /tmp/... ; git checkout -- logs.json   # logs.json is tracked in git AND written
git pull origin main                                 # by the live app — park it so pull works,
cp /tmp/... logs.json                                # then put the live logs back
docker compose up -d --build
curl http://localhost:3005/api/auto                  # should return {"enabled":...,"lastPolled":...}
```

---

## Data that lives only on the server

`config.json`, `state.json` and `logs.json` in `/var/www/dropbox-automation` are mounted
into the container, so they survive rebuilds. **The live `config.json` is the real one**
(it's edited through the web UI) — your local copy can be out of date. Use the
"Export config.json" button on the Configuration page to get the current one.

`history.json` is *not* mounted, so it resets on every rebuild.

---

## Polling

The app polls Monday.com by itself every 5 minutes (background poller started on boot).
- The automatic poll only creates folders for tasks in **Form Requests**.
- The homepage **Run Instant Sync** button handles every task without a Dropbox link,
  in any group except Completed (per-board `sync_excluded_groups` in config.json).

---

## Troubleshooting

| Problem | Command (on the server, in the app folder) |
|---|---|
| App logs | `docker compose logs -f app` |
| Restart without rebuilding | `docker compose restart app` |
| What's running | `docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'` |
| Which code version is live | `git log --oneline -1` |
| Ports unreachable from outside | Normal — Hostinger's firewall is in hPanel → VPS → Firewall, not on the server |

---

## First-time setup (for reference — already done)

1. As root: `git clone https://github.com/alonkatzParticle/Dropbox_Universal.git /var/www/dropbox-automation`
2. Create `/var/www/dropbox-automation/.env` with `MONDAY_API_TOKEN`, `DROPBOX_APP_KEY`,
   `DROPBOX_APP_SECRET`, `DROPBOX_REFRESH_TOKEN`. Do **not** set `KV_REST_API_URL` or
   `VERCEL` (their absence makes the app use the local JSON files).
3. Create `config.json`, `state.json` (`{}`) and `logs.json` (`[]`) **before** starting —
   otherwise Docker creates folders with those names and the app breaks.
4. `docker compose up -d --build`
5. Nginx site file pointing the domain at `localhost:3005`, then `nginx -t && systemctl reload nginx`.
6. DNS A record for the subdomain → `76.13.2.74`.
