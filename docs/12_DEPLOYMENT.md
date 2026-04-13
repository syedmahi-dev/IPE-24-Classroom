# Deployment — Server Setup, Docker, Nginx, CI/CD

## Server Requirements

- **OS:** Ubuntu 22.04 LTS (recommended)
- **RAM:** Minimum 4GB (transcriber + web app + postgres + redis + bots)
- **Storage:** Minimum 20GB (OS + Docker images + DB + backups)
- **CPU:** 2+ cores (faster-whisper runs on CPU)

---

## Phase 0: Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essentials
sudo apt install -y \
  git curl wget unzip \
  nginx certbot python3-certbot-nginx \
  fail2ban ufw \
  cron

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose plugin
sudo apt install -y docker-compose-plugin
docker compose version  # Verify

# Create project directory
mkdir -p /home/ubuntu/ipe24
```

---

## Phase 1: Firewall Setup

```bash
# UFW basic rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh        # Port 22
sudo ufw allow http       # Port 80
sudo ufw allow https      # Port 443
sudo ufw enable

# Fail2ban for SSH protection
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## Phase 2: Domain & SSL

### Register Domain (GitHub Student Pack)
1. Go to [education.github.com/pack](https://education.github.com/pack)
2. Find **name.com** — redeem 1 free `.me` domain
3. Register `ipe24.me` or `iut-ipe24.me`
4. In name.com DNS panel, add:
   - `A record` → `@` → `YOUR_SERVER_IP`
   - `A record` → `www` → `YOUR_SERVER_IP`
5. Wait for DNS propagation (5–30 minutes)

### Generate SSL Certificate
```bash
# Get certificate for your domain
sudo certbot --nginx -d your-domain.me -d www.your-domain.me

# Verify auto-renewal works
sudo certbot renew --dry-run

# Certbot installs a systemd timer for auto-renewal — check it:
sudo systemctl status certbot.timer
```

---

## Phase 3: Nginx Configuration

```nginx
# /etc/nginx/conf.d/ipe24.conf

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=general:10m rate=60r/m;

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.me www.your-domain.me;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.me www.your-domain.me;

    ssl_certificate /etc/letsencrypt/live/your-domain.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.me/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # Block internal API from external access
    location /api/v1/internal/ {
        allow 172.16.0.0/12;  # Docker internal network
        deny all;
    }

    # Auth endpoints — strict rate limit
    location /api/auth/ {
        limit_req zone=auth_limit burst=2 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API endpoints — moderate rate limit
    location /api/ {
        limit_req zone=api_limit burst=10 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;  # For streaming chat responses
        proxy_buffering off;     # Required for SSE/streaming
    }

    # n8n admin panel — password protected via n8n's own auth
    location /n8n/ {
        allow 127.0.0.1;        # Only allow access from server itself
        # OR allow specific IP: allow YOUR_HOME_IP;
        deny all;
        proxy_pass http://127.0.0.1:5678/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # Uptime Kuma — local access only
    location /uptime/ {
        allow 127.0.0.1;
        deny all;
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }

    # Main Next.js app
    location / {
        limit_req zone=general burst=20 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }

    # Increase max upload size for file uploads
    client_max_body_size 30M;
}
```

```bash
# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

---

## Phase 4: Environment Files

```bash
cd /home/ubuntu/ipe24

# Create all .env files
# Copy from templates and fill in real values

# Web app
cp apps/web/.env.example apps/web/.env
nano apps/web/.env

# Bots
cp apps/bot/.env.example apps/bot/.env
cp services/discord-bot/.env.example services/discord-bot/.env
cp services/telegram-bot/.env.example services/telegram-bot/.env

# n8n
cp infrastructure/.env.n8n.example infrastructure/.env.n8n

# Verify no secrets committed to git
cat .gitignore  # Should include: .env, .env.*
```

---

## Phase 5: First Deploy

```bash
cd /home/ubuntu/ipe24

# Clone repository
git clone git@github.com:your-username/ipe24-web.git .

# Build and start all services
cd infrastructure
docker compose up -d --build

# Check all containers are running
docker compose ps

# Check logs for errors
docker compose logs web --tail=50
docker compose logs postgres --tail=20
docker compose logs transcriber --tail=20

# Run database migrations
docker compose exec web npx prisma migrate deploy

# Seed initial data (courses, etc.)
docker compose exec web npx tsx prisma/seed.ts
```

---

## Phase 6: GitHub Actions CI/CD

### Repository Secrets (Settings → Secrets → Actions)
```
SERVER_HOST=your-server-ip
SERVER_USER=ubuntu
SERVER_SSH_KEY=<paste private SSH key>
SERVER_PATH=/home/ubuntu/ipe24
```

### Workflow File
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: apps/web/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: apps/web

      - name: Type check
        run: npx tsc --noEmit
        working-directory: apps/web

      - name: Lint
        run: npm run lint
        working-directory: apps/web

      - name: Security audit
        run: npm audit --audit-level=high
        working-directory: apps/web

      - name: Run tests
        run: npx vitest run
        working-directory: apps/web

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd ${{ secrets.SERVER_PATH }}
            git pull origin main
            cd infrastructure
            docker compose pull
            docker compose up -d --build web
            docker compose exec -T web npx prisma migrate deploy
            # Clean up old images
            docker image prune -f
            echo "Deploy complete at $(date)"
```

---

## Phase 7: WhatsApp First-Time QR Setup

```bash
# Run the WhatsApp bot interactively to display QR code
docker compose run --rm whatsapp-bot

# Scan the QR code that appears in terminal with your dedicated WhatsApp number
# (WhatsApp → Settings → Linked Devices → Link a Device)

# After scanning, auth session is saved to the whatsapp_auth Docker volume
# Stop the interactive container and start normally:
docker compose up -d whatsapp-bot
docker compose logs whatsapp-bot --follow
# Should see: "WhatsApp connected ✓"
```

---

## Phase 8: n8n Workflow Import

```bash
# Access n8n (from your local machine via SSH tunnel)
ssh -L 5678:127.0.0.1:5678 ubuntu@your-server-ip

# Open http://localhost:5678 in browser
# Create admin account on first access
# Import workflow: Settings → Import from File → upload the n8n workflow JSON
# Configure credentials:
#   - Gemini API Key
#   - Telegram Bot Token
# Activate the workflow
```

---

## Phase 9: Monitoring Setup

```bash
# Access Uptime Kuma (SSH tunnel)
ssh -L 3001:127.0.0.1:3001 ubuntu@your-server-ip
# Open http://localhost:3001

# Add monitors:
# 1. Website: HTTP(s) → https://your-domain.me → every 1 min
# 2. Web API: HTTP(s) → https://your-domain.me/api/v1/health → every 1 min
# 3. WhatsApp bot: HTTP(s) → http://127.0.0.1:3002/health → every 1 min
# 4. Discord bot: HTTP(s) → http://127.0.0.1:3003/health → every 1 min
# 5. Transcriber: HTTP(s) → http://127.0.0.1:8000/health → every 1 min

# Set notification: Telegram → paste bot token + your chat ID
# You'll get Telegram alerts when any service goes down
```

---

## Database Backup Cron

```bash
# Create backup script
sudo mkdir -p /backups/postgres
cat > /home/ubuntu/backup-db.sh << 'EOF'
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
docker exec ipe24-postgres pg_dump -U ipe24 ipe24_db | gzip > "$BACKUP_DIR/ipe24_$TIMESTAMP.sql.gz"
find $BACKUP_DIR -name "*.sql.gz" -mtime +14 -delete
echo "$(date): Backup complete → ipe24_$TIMESTAMP.sql.gz" >> /var/log/ipe24-backup.log
EOF
chmod +x /home/ubuntu/backup-db.sh

# Add to crontab (run at 3 AM daily)
(crontab -l 2>/dev/null; echo "0 3 * * * /home/ubuntu/backup-db.sh") | crontab -
```

---

## Common Maintenance Commands

```bash
# View all service logs
docker compose logs --follow

# Restart a specific service
docker compose restart web

# Update and redeploy everything
git pull origin main
docker compose up -d --build
docker compose exec web npx prisma migrate deploy

# Check disk usage
df -h
docker system df

# Free up disk space (removes unused images/containers)
docker system prune -f

# Restore database from backup
gunzip -c /backups/postgres/ipe24_20241101_030000.sql.gz | \
  docker exec -i ipe24-postgres psql -U ipe24 ipe24_db

# Open Prisma Studio remotely (via SSH tunnel)
ssh -L 5555:127.0.0.1:5555 ubuntu@your-server-ip
docker compose exec web npx prisma studio --port 5555
# Open http://localhost:5555 in browser
```

---

## Launch Checklist

```
PRE-LAUNCH:
[ ] All environment variables filled in
[ ] Database migrated and seeded with courses
[ ] Google OAuth working (test with your IUT email)
[ ] Domain resolves correctly (nslookup your-domain.me)
[ ] SSL certificate valid (https:// loads without warning)
[ ] All Docker containers running (docker compose ps)
[ ] WhatsApp bot connected
[ ] Discord bot online in server
[ ] Telegram bot responding to /start
[ ] n8n workflow activated
[ ] Uptime Kuma monitoring all services
[ ] GitHub Actions CI passing
[ ] Knowledge base seeded with FAQ and syllabi
[ ] super_admin role set for CR account
[ ] Rate limiting working (test with curl loop)
[ ] Nginx security headers present (check with securityheaders.com)
[ ] npm audit passing (no high/critical)

POST-LAUNCH:
[ ] Share URL with class
[ ] Walk through login with a few students
[ ] Test Telegram → announcement pipeline
[ ] Verify WhatsApp community receives announcement
[ ] Verify Discord receives announcement
[ ] Test AI chatbot with 5 common questions
[ ] Monitor logs for first 24 hours
```
