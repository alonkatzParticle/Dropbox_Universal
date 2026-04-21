# Dropbox Automation — VPS Deployment Guide
> Deploy to `automation.particle-creative.cloud` on the shared Hostinger VPS.
> Port: **3003** (next available after 3002)

---

## First-Time Setup

### 1. SSH in as deploy user
```bash
ssh deploy@76.13.2.74
```

### 2. Check nothing is on port 3003
```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

### 3. Clone the repo
```bash
mkdir /var/www/dropbox-automation
git clone https://github.com/alonkatzParticle/Dropbox_Universal.git /var/www/dropbox-automation
cd /var/www/dropbox-automation
```

### 4. Create the .env file
```bash
nano /var/www/dropbox-automation/.env
```
Paste these values (get real values from Vercel dashboard → Settings → Environment Variables):
```
MONDAY_API_TOKEN=your_token_here
DROPBOX_APP_KEY=your_key_here
DROPBOX_APP_SECRET=your_secret_here
DROPBOX_REFRESH_TOKEN=your_token_here
# DO NOT add KV_REST_API_URL — absence triggers file-based storage
# DO NOT add VERCEL — absence ensures files go to /app/, not /tmp/
```

### 5. Seed the data files
Copy your current `config.json`, `state.json`, `logs.json` from the project root
(use the Export button on the Configuration page to get config.json):
```bash
# From your local machine:
scp config.json deploy@76.13.2.74:/var/www/dropbox-automation/
scp state.json deploy@76.13.2.74:/var/www/dropbox-automation/
# Create empty logs.json if you don't have one:
echo "[]" > /var/www/dropbox-automation/logs.json
```

### 6. Build and start
```bash
cd /var/www/dropbox-automation
docker compose up -d --build
```

### 7. Verify the container is healthy
```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
# Should show dropbox-automation-app-1   Up X seconds (healthy)   0.0.0.0:3003->3000/tcp

curl http://localhost:3003/api/auto
# Should return: {"enabled":true,"lastPolled":"..."}
```

### 8. Set up the cron job (replaces Vercel cron)
Vercel ran `/api/cron/poll` every 5 minutes. On VPS, use crontab:
```bash
crontab -e
```
Add this line:
```
*/5 * * * * curl -s http://localhost:3003/api/cron/poll >> /var/log/dropbox-automation-cron.log 2>&1
```
Verify it's registered:
```bash
crontab -l
```

---

## Nginx Setup (as root)

### 9. SSH in as root
```bash
ssh root@76.13.2.74
```

### 10. Create the nginx vhost
```bash
cat > /etc/nginx/sites-available/dropbox-automation << 'EOF'
server {
    listen 80;
    server_name automation.particle-creative.cloud;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/dropbox-automation /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 11. DNS
Point `automation.particle-creative.cloud` A record → `76.13.2.74` in your DNS provider.

### 12. Final check
```bash
curl http://automation.particle-creative.cloud/api/auto
# Should return JSON — if it does, you're live
```

---

## Routine Redeploy (after git push)

```bash
ssh deploy@76.13.2.74
cd /var/www/dropbox-automation
git pull origin main
docker compose up -d --build
```

> ⚠️ The bind-mounted `config.json`, `state.json`, `logs.json` survive rebuilds
> because they live on the host, not inside the container image.

---

## Useful Commands

| Task | Command |
|---|---|
| View app logs | `cd /var/www/dropbox-automation && docker compose logs -f app` |
| Restart app | `cd /var/www/dropbox-automation && docker compose restart app` |
| Check cron log | `tail -f /var/log/dropbox-automation-cron.log` |
| Open nginx config | `nano /etc/nginx/sites-available/dropbox-automation` |
| Check all containers | `docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'` |
