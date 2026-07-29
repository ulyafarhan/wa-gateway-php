#!/bin/bash
# Setup waaceh.biz.id — nginx + SSL + DNS
# Jalankan di VPS: bash scripts/setup-domain.sh
set -e

DOMAIN="waaceh.biz.id"
NGINX_CONF="/etc/nginx/sites-enabled/waaceh"
ADMIN_DOMAIN="wa.gampong.web.id"

echo "=== 1. Buat nginx config ==="
sudo tee $NGINX_CONF > /dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name waaceh.biz.id www.waaceh.biz.id;

    # Ponytail: same hardened config as wa.gampong.web.id
    location / {
        proxy_pass http://127.0.0.1:2785;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Security
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy strict-origin-when-cross-origin;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()";
    server_tokens off;

    # Rate limit
    limit_req zone=api burst=30 nodelay;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name waaceh.biz.id www.waaceh.biz.id;

    # SSL — certbot will fill this
    ssl_certificate /etc/letsencrypt/live/waaceh.biz.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/waaceh.biz.id/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:2785;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    server_tokens off;
    limit_req zone=api burst=30 nodelay;
}
EOF

echo "=== 2. Test nginx ==="
sudo nginx -t

echo "=== 3. Get SSL ==="
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m admin@waaceh.biz.id

echo "=== 4. Reload ==="
sudo systemctl reload nginx

echo "=== 5. Update .env with new domain ==="
echo "" >> /home/ubuntu/wa-gateway/.env
echo "# Domain" >> /home/ubuntu/wa-gateway/.env
echo "APP_URL=https://$DOMAIN" >> /home/ubuntu/wa-gateway/.env
echo "CORS_ORIGINS=https://$ADMIN_DOMAIN,https://$DOMAIN,http://localhost:2785,http://localhost:5173" >> /home/ubuntu/wa-gateway/.env

echo ""
echo "=== DONE ==="
echo "Set DNS:"
echo "  A record: @ → 52.77.165.51"
echo "  A record: www → 52.77.165.51"
echo "  CNAME: @ → wa.gampong.web.id (if using Cloudflare proxy)"
echo ""
echo "Then visit: https://$DOMAIN"
