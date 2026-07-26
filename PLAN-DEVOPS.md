## Bagian 5: DevOps & Delivery

### 5.1 Deployment Architecture

```
Internet → wa-gampong.my.id:443
                ↓
          [Cloudflare DNS — proxied (orange cloud)]
                ↓
    ┌──────────────────────────┐
    │    nGinX (port 80/443)   │
    │  wa-gampong.my.id.conf   │
    │                          │
    │  / → proxy_pass :2785    │
    │  /assets → static files  │
    │  SSL termination         │
    └──────────┬───────────────┘
               ↓ :2785
    ┌──────────────────────────┐
    │  Node.js (Express v5)    │
    │  --max-old-space-size=128│
    │  server.mjs              │
    │                          │
    │  SSR: EJS views/         │
    │  API: /api/* routes      │
    │  Admin: /api/admin/*     │
    └──────────────────────────┘
        ├─────────────┬──────────────┐
        ↓             ↓              ↓
   SQLite (WAL)  WARP SOCKS5    Supabase/D1
   data/wagatewa 127.0.0.1:40   sync engine
   ych.db        000            (async)
```

**Folder Structure VPS:**

```
/home/ubuntu/wa-gateway/
├── server.mjs            # Entry point
├── package.json
├── .env                  # Environment (chmod 600)
├── auth_info/            # WhatsApp session data (sensitive!)
├── data/
│   ├── wagateway.db      # SQLite database
│   ├── wagateway.db-wal  # WAL file
│   └── wagateway.db-shm  # Shared memory file
├── dist/                 # Vue SPA build output (if used)
├── public/
│   └── assets/           # Static assets
├── src/                  # Server source
├── views/                # EJS templates
├── frontend/             # Vue source (dev only)
└── deploy.tar.gz         # Build artifact
```

**Port Mapping:**

| Service | Port | Binding | Protocol |
|---------|------|---------|----------|
| nGinX HTTP | 80 | 0.0.0.0 | TCP |
| nGinX HTTPS | 443 | 0.0.0.0 | TCP |
| Node.js | 2785 | 127.0.0.1 | TCP |
| WARP SOCKS5 | 40000 | 127.0.0.1 | TCP |

---

### 5.2 Systemd Service Optimization

**Unit file: `/etc/systemd/system/wa-gateway.service`**

```ini
[Unit]
Description=WA Gateway v4 - SIG-Udeung
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/wa-gateway

# Node.js binary via nvm
ExecStart=/home/ubuntu/.nvm/versions/node/v24.18.0/bin/node \
    --max-old-space-size=128 \
    --max-semi-space-size=8 \
    --expose-gc \
    server.mjs

# Environment
EnvironmentFile=/home/ubuntu/wa-gateway/.env
Environment=NODE_ENV=production
Environment=PATH=/home/ubuntu/.nvm/versions/node/v24.18.0/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Restart policy
Restart=always
RestartSec=10
StartLimitIntervalSec=60
StartLimitBurst=3

# OOM / resource
OOMScoreAdjust=500
MemoryMax=256M
MemoryHigh=192M
CPUQuota=80%

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=/home/ubuntu/wa-gateway/data /home/ubuntu/wa-gateway/auth_info
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true

# Logging
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Perubahan dari unit file eksisting:**

| Parameter | Sebelum | Sesudah | Alasan |
|-----------|---------|---------|--------|
| `--max-old-space-size` | tidak ada | 128 | Batasi heap Node.js |
| `--max-semi-space-size` | tidak ada | 8 | Kurangi GC pause |
| `--expose-gc` | tidak ada | ada | GC manual jika perlu |
| `RestartSec` | 5 | 10 | Hindari restart loop pada transient error |
| `StartLimitBurst` | tidak ada | 3 | Fail setelah 3x crash dalam 60s |
| `OOMScoreAdjust` | tidak ada | 500 | Prioritaskan kill wa-gateway dibanding SSHD/nginx |
| `MemoryMax` | tidak ada | 256M | Cgroup memory limit |
| `MemoryHigh` | tidak ada | 192M | Soft limit, mulai throttle |
| `CPUQuota` | tidak ada | 80% | Sisa untuk OS dan WARP |
| Security hardening | tidak ada | systemd sandboxing | Proteksi dari session take-over |

**Reload & Apply:**
```bash
sudo systemctl daemon-reload
sudo systemctl restart wa-gateway
sudo systemctl status wa-gateway
```

---

### 5.3 nGinX Configuration

**File: `/etc/nginx/sites-available/wa-gampong.my.id`**

```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name wa-gampong.my.id;

    location / {
        return 301 https://$host$request_uri;
    }

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name wa-gampong.my.id;

    # SSL — managed by Certbot
    ssl_certificate /etc/letsencrypt/live/wa-gampong.my.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wa-gampong.my.id/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/wa-gampong.my.id/chain.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header X-XSS-Protection "0" always;

    # Hide nginx version
    server_tokens off;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
    limit_req_zone $binary_remote_addr zone=static:10m rate=100r/s;

    # Deny internal paths
    location ~ /\.(?!well-known) {
        deny all;
        return 404;
    }
    location ~ /\.env {
        deny all;
        return 404;
    }
    location ~ /node_modules {
        deny all;
        return 404;
    }
    location ~ /src {
        deny all;
        return 404;
    }

    # Static assets — cache + gzip
    location /assets/ {
        proxy_pass http://127.0.0.1:2785;
        limit_req zone=static burst=50 nodelay;
        expires 7d;
        add_header Cache-Control "public, immutable";

        # Brotli (if module available) or gzip
        gzip on;
        gzip_types text/css application/javascript application/json image/svg+xml;
        gzip_min_length 256;
        gzip_vary on;
        gzip_proxied any;
    }

    # API — reverse proxy
    location /api/ {
        proxy_pass http://127.0.0.1:2785;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Rate limit API
        limit_req zone=api burst=10 nodelay;

        # Timeouts
        proxy_connect_timeout 10s;
        proxy_read_timeout 30s;
        proxy_send_timeout 10s;

        # Buffer
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }

    # All other routes → Node.js (SSR)
    location / {
        proxy_pass http://127.0.0.1:2785;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_connect_timeout 10s;
        proxy_read_timeout 60s;
        proxy_send_timeout 10s;
    }

    # Access logging (minimal)
    access_log /var/log/nginx/wa-gampong.my.id-access.log combined buffer=64k flush=1m;
    error_log /var/log/nginx/wa-gampong.my.id-error.log warn;
}
```

**Aktifkan site & test:**
```bash
sudo ln -sf /etc/nginx/sites-available/wa-gampong.my.id /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### 5.4 Memory Optimization Strategy

#### 5.4.1 Node.js Heap

**Rekomendasi: `--max-old-space-size=128` SUDAH CUKUP.**

Perhitungan untuk 414MB RAM total:

| Komponen | Estimasi RAM |
|----------|-------------|
| OS + services (sshd, systemd, cron) | ~60 MB |
| nGinX | ~15 MB |
| WARP (forced) | ~65 MB |
| **Node.js (128MB heap)** | **~150 MB** |
| SQLite (WAL cache) | ~16 MB |
| **Total** | **~306 MB** |

Sisa ~108MB untuk page cache dan spike. Ini sehat.

Jika terjadi OOM, tambahkan swap usage: `vm.swappiness=10` (lihat 5.4.3).

#### 5.4.2 SQLite WAL Optimization

**Set dari aplikasi (`src/db.js`):**

```sql
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;         -- aman untuk WAL, lebih cepat dari FULL
PRAGMA cache_size=-4000;           -- 4MB page cache (cukup untuk <500MB DB)
PRAGMA page_size=4096;             -- default, optimal untuk HDD/SSD umum
PRAGMA temp_store=MEMORY;          -- temp tables di RAM (limit 2GB via sqlite)
PRAGMA mmap_size=268435456;        -- 256MB memory-mapped I/O
PRAGMA busy_timeout=5000;          -- 5 detik timeout untuk concurrent access
PRAGMA wal_autocheckpoint=1000;    -- checkpoint setiap 1000 page (~4MB WAL growth)
```

**Auto-checkpoint cron:** SQLite WAL auto-checkpoint sudah ditangani oleh PRAGMA. Tapi untuk jaga-jaga kalau DB idle lama:

```bash
# /etc/cron.hourly/sqlite-wal-checkpoint
#!/bin/bash
DB=/home/ubuntu/wa-gateway/data/wagateway.db
if [ -f "$DB" ]; then
    sqlite3 "$DB" "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null
fi
```

```bash
sudo chmod +x /etc/cron.hourly/sqlite-wal-checkpoint
```

#### 5.4.3 Swap & Kernel Tuning

```bash
# /etc/sysctl.d/90-wa-gateway.conf
vm.swappiness=10            # Jangan swap kecuali darurat
vm.vfs_cache_pressure=50    # Cache page lebih lama sebelum di-evict
kernel.randomize_va_space=2 # ASLR tetap aktif (security)
net.core.somaxconn=1024     # backlog koneksi untuk nginx
```

```bash
sudo sysctl -p /etc/sysctl.d/90-wa-gateway.conf
```

#### 5.4.4 Monitoring via Cron

```bash
# /etc/cron.hourly/memory-check
#!/bin/bash
LOG=/var/log/wa-gateway-memory.log
echo "--- $(date -u '+%Y-%m-%dT%H:%M:%SZ') ---" >> "$LOG"
echo "Memory:" >> "$LOG"
free -h >> "$LOG"
echo "Node (PID $(pgrep -f 'server.mjs' | head -1)):" >> "$LOG"
ps -o pid,rss,%mem,cmd -p $(pgrep -f 'server.mjs' | head -1) 2>/dev/null >> "$LOG"
echo "SQLite size:" >> "$LOG"
du -sh /home/ubuntu/wa-gateway/data/wagateway.db* 2>/dev/null >> "$LOG"
echo "Swap:" >> "$LOG"
swapon --show >> "$LOG"
```

---

### 5.5 SSL/HTTPS

#### 5.5.1 Certbot Setup

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d wa-gampong.my.id --non-interactive --agree-tos -m admin@wa-gampong.my.id
```

#### 5.5.2 Auto-Renew

Certbot sudah memasang systemd timer secara default. Verifikasi:

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

Timer akan mencoba renew 2x sehari. Sertifikat yang >30 hari akan di-skip. nGinX reload otomatis via `--nginx` hook.

Jika ingin cron manual (fallback):

```bash
# /etc/cron.d/certbot-renew
0 3 * * * root certbot renew --quiet --no-self-upgrade && systemctl reload nginx
```

#### 5.5.3 HSTS

Sudah termasuk di konfigurasi nGinX:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

Setelah SSL stabil 1-2 minggu, submit domain ke [hstspreload.org](https://hstspreload.org) untuk preload list.

---

### 5.6 Backup & Disaster Recovery

#### 5.6.1 Strategi Dual-Write (Existing)

Aplikasi sudah mengimplementasi dual-write ke:
- **Supabase (PostgreSQL)** — real-time via sync engine
- **Cloudflare D1** — edge replica via sync engine

Ini adalah backup real-time terbaik. Jika SQLite corrupt, data bisa di-restore dari Supabase.

#### 5.6.2 SQLite File Backup (Daily Cron)

```bash
# /etc/cron.d/wa-gateway-backup
# Daily SQLite backup — retensi 7 hari
0 4 * * * ubuntu /home/ubuntu/wa-gateway/scripts/backup-db.sh
```

**Script: `/home/ubuntu/wa-gateway/scripts/backup-db.sh`**

```bash
#!/bin/bash
set -e

DB=/home/ubuntu/wa-gateway/data/wagateway.db
BACKUP_DIR=/home/ubuntu/backups
RETENTION=7
TIMESTAMP=$(date -u '+%Y%m%dT%H%M%SZ')
S3_BUCKET="s3://wa-gateway-backup/wagateway"  # opsional

mkdir -p "$BACKUP_DIR"

# Backup via sqlite3 (safe backup, consistent)
sqlite3 "$DB" ".backup '$BACKUP_DIR/wagateway-$TIMESTAMP.db'"

# Compress
gzip -f "$BACKUP_DIR/wagateway-$TIMESTAMP.db"

# Hapus backup lebih dari RETENTION hari
find "$BACKUP_DIR" -name 'wagateway-*.db.gz' -mtime +$RETENTION -delete

# Opsional: upload ke S3-compatible (contoh: Backblaze B2, Cloudflare R2, atau Supabase Storage)
# UPLOAD_URL="https://storage.bunnycdn.com/..."
# curl -X PUT -H "AccessKey: $BUNNY_API_KEY" --data-binary @"$BACKUP_DIR/wagateway-$TIMESTAMP.db.gz" "$UPLOAD_URL"
```

```bash
chmod +x /home/ubuntu/wa-gateway/scripts/backup-db.sh
```

**Alternatif S3-compatible gratis:**
- **Backblaze B2** ~10GB gratis pertama
- **Cloudflare R2** ~10GB gratis, no egress fee
- **Supabase Storage** ~1GB gratis (pakai project yang sudah ada)
- **BunnyCDN Storage** ~10GB gratis (perlu Storage Zone)

#### 5.6.3 Recovery Procedure

```bash
# 1. Hentikan service
sudo systemctl stop wa-gateway

# 2. Backup DB corrupt (untuk investigasi)
mv /home/ubuntu/wa-gateway/data/wagateway.db /home/ubuntu/wa-gateway/data/wagateway.db.corrupt

# 3. Restore dari backup harian
gunzip -k /home/ubuntu/backups/wagateway-20260322T040000Z.db.gz
cp /home/ubuntu/backups/wagateway-20260322T040000Z.db /home/ubuntu/wa-gateway/data/wagateway.db

# 4. Restore dari Supabase (jika backup file juga corrupt)
#    Jalankan sync reverse dari Supabase → SQLite
node scripts/restore-from-supabase.mjs

# 5. Start service
sudo systemctl start wa-gateway

# 6. Verifikasi
sudo journalctl -u wa-gateway -n 20 --no-pager
```

---

### 5.7 CI/CD (Optional — Budget Rp0)

#### 5.7.1 Rekomendasi: GitHub Actions + rsync

Mengikuti prinsip ponytail — **build di CI, deploy via rsync**. Tidak perlu Docker, Kubernetes, atau pipeline kompleks.

**File: `.github/workflows/deploy.yml`**

```yaml
name: Deploy to VPS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --omit=dev

      - name: Deploy via rsync
        uses: easingthemes/ssh-deploy@v4
        with:
          SSH_PRIVATE_KEY: ${{ secrets.VPS_SSH_KEY }}
          ARGS: "-avz --delete --exclude='.env' --exclude='auth_info/' --exclude='data/' --exclude='node_modules/'"
          SOURCE: "."
          REMOTE_HOST: wa-gampong.my.id
          REMOTE_USER: ubuntu
          TARGET: /home/ubuntu/wa-gateway

      - name: Install production deps & restart
        uses: appleboy/ssh-action@v1
        with:
          host: wa-gampong.my.id
          username: ubuntu
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /home/ubuntu/wa-gateway
            npm ci --omit=dev
            sudo systemctl restart wa-gateway
```

**Manual alternative (kapan saja bisa):**

```bash
# Build artifact lokal
tar --exclude='.env' --exclude='auth_info' --exclude='data' --exclude='node_modules' -czf deploy.tar.gz .

# Upload
scp -i vps-murah.pem deploy.tar.gz ubuntu@wa-gampong.my.id:/home/ubuntu/

# Deploy remote
ssh -i vps-murah.pem ubuntu@wa-gampong.my.id "
  cd /home/ubuntu/wa-gateway &&
  tar xzf ../deploy.tar.gz &&
  npm ci --omit=dev &&
  sudo systemctl restart wa-gateway
"
```

#### 5.7.2 Frontend Build Pipeline

```bash
# NPM script yang sudah ada
npm run build:frontend   # cd frontend && npm run build
```

Build output akan di-copy ke `public/` atau `views/` secara otomatis. Include dalam deploy artifact.

---

### 5.8 Monitoring (Minimal — Tanpa Third-Party)

#### 5.8.1 Health Endpoint

**Sudah ada di aplikasi?** Periksa `src/routes.js`:

```javascript
// GET /api/health
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        db: db.prepare('SELECT COUNT(*) as sessions FROM sessions').get(),
        sync: syncHealthCheck(),
        timestamp: new Date().toISOString()
    });
});
```

**PENTING:** Pastikan endpoint `/api/health` TIDAK membutuhkan autentikasi (public), tapi hanya expose metric esensial — jangan bocorkan API key atau JWT secret.

#### 5.8.2 Systemd Journal

```bash
# View logs
sudo journalctl -u wa-gateway -n 100 --no-pager
sudo journalctl -u wa-gateway -f                    # follow

# Journal size limit (default 100MB, bisa diperkecil)
sudo journalctl --vacuum-size=50M                    # hapus log >50MB
# Persisten: edit /etc/systemd/journald.conf
# SystemMaxUse=50M
```

```bash
# /etc/systemd/journald.conf — optimal untuk 414MB VPS
[Journal]
Storage=persistent
Compress=yes
SystemMaxUse=50M
SystemMaxFileSize=10M
MaxRetentionSec=7day
ForwardToSyslog=no
```

```bash
sudo systemctl restart systemd-journald
```

#### 5.8.3 Resource Usage Logging

Cron untuk log resource (sudah di 5.4.4). Output di `/var/log/wa-gateway-memory.log`.

#### 5.8.4 Uptime Check (Opsional — Gratis)

| Service | Gratis | Frequency | Notes |
|---------|--------|-----------|-------|
| **UptimeRobot** | 50 monitor, 5min interval | 5 menit | HTTP(S) check ke /api/health |
| **Pingdom** | 1 monitor, 1min | 1 menit | Limited |
| **BetterStack** | 10 monitors, 30s | 30 detik | Generous free tier |

Recommended: **UptimeRobot** — cukup 1 monitor ke `https://wa-gampong.my.id/api/health`, notifikasi via email.

---

### 5.9 Performance Budget

| Metric | Target | Cara Ukur | Cara Capai |
|--------|--------|-----------|------------|
| **Node.js RSS** | < 256MB | `ps -o rss $(pgrep -f server.mjs)` | `--max-old-space-size=128`, heap limit via systemd `MemoryMax=256M` |
| **API response time** | < 100ms (p50) | `curl -w '%{time_total}'` atau via health endpoint | Pastikan SQLite query di-index dengan benar. Cache query user_profiles/contacts. |
| **SSR page load** | < 500ms | `curl -w '%{time_total}' /dashboard` | EJS render + server-side data fetch langsung, tanpa waterfall |
| **Vue SPA first load** | < 2s (jika ada) | Lighthouse / DevTools Network | nGinX cache static assets 7d, gzip/brotli, preload critical CSS |
| **DB size** | < 500MB sebelum backup | `du -sh data/wagateway.db` | SQLite page_size=4096, auto_vacuum=INCREMENTAL |
| **Disk usage** | < 80% (15GB dari 19GB) | `df -h` | Log journal 50M, log nginx access buffer + flush 1m, hapus backup >7 hari |

#### Monitoring Performance (One-liner)

```bash
# Cek semuanya sekaligus
echo "=== Node RSS ===" && ps -o rss= -p $(pgrep -f 'server.mjs' | head -1) | awk '{printf "%dMB\n", $1/1024}' && echo "=== API latency ===" && curl -so /dev/null -w '%{time_total}s\n' http://127.0.0.1:2785/api/health && echo "=== SSR latency ===" && curl -so /dev/null -w '%{time_total}s\n' http://127.0.0.1:2785/ && echo "=== DB size ===" && du -sh /home/ubuntu/wa-gateway/data/wagateway.db && echo "=== Disk ===" && df -h / | tail -1 | awk '{print $3 " used / " $2 " (" $5 ")"}'
```

---

### Ringkasan Tindakan Prioritas (Urutan Eksekusi)

1. **Hari 1 — Dasar**
   - Pasang Certbot + dapatkan SSL
   - Update systemd service dengan memory limits
   - Pasang konfigurasi nGinX (lengkap dengan security headers + rate limit)

2. **Hari 1-2 — Optimasi**
   - Set kernel params (`vm.swappiness=10`, dll)
   - Set SQLite PRAGMA optimal di `src/db.js`
   - Setup journald dengan size limit 50M

3. **Hari 2 — Backup**
   - Setup cron backup SQLite harian
   - Verifikasi dual-write sync ke Supabase (sudah jalan?)
   - Buat recovery procedure document

4. **Hari 2-3 — Monitoring**
   - Setup `/api/health` endpoint (public, tanpa auth)
   - Setup memory monitoring cron
   - Daftar UptimeRobot (opsional)

5. **Hari 3 — CI/CD (Opsional)**
   - Setup GitHub Actions + SSH deploy key
   - Atau cukup dokumentasi manual deploy

6. **Verifikasi**
   - Test SSL: `curl -I https://wa-gampong.my.id`
   - Test HSTS: `curl -s -D- https://wa-gampong.my.id | grep -i strict`
   - Test performance: one-liner monitoring di 5.9
   - Test restart: `sudo systemctl restart wa-gateway && sleep 3 && curl -s http://127.0.0.1:2785/api/health`
