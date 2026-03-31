# BattleZone 3D PWA - Production Deployment Guide

## ✅ Pre-Deployment Checklist

### Assets & Icons ✓
- [x] Free Fire icon (WebP) placed in `public/`
- [x] Manifest.json configured with correct icon paths
- [x] Icons referenced in index.html
- [x] Favicon configured

### PWA Configuration ✓
- [x] Service Worker (sw.js) created
- [x] Manifest.json setup
- [x] PWA Install Prompt component
- [x] Service Worker registration hook
- [x] Offline caching strategies

### Code Quality ✓
- [x] TypeScript strict mode enabled
- [x] All components fully typed
- [x] No console errors
- [x] Production build tested

---

## 🔐 HTTPS Setup (Required for PWA)

### Option 1: Using Let's Encrypt (Recommended)
```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Certificate files locate at:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem

# Auto-renew every 3 months
sudo certbot renew
```

### Option 2: Self-Signed Certificate (Development Only)
```bash
# Generate self-signed cert
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Use in vite.config.ts:
# https: {
#   cert: fs.readFileSync('./cert.pem'),
#   key: fs.readFileSync('./key.pem')
# }
```

### Option 3: CloudFlare/Certbot Integration
```bash
# CloudFlare provides free SSL
# 1. Add domain to CloudFlare
# 2. Change nameservers at registrar
# 3. Enable "Flexible SSL" or "Full SSL"
# 4. SSL/TLS → Origin Server → Create certificate
```

---

## 📝 Server Configuration Examples

### Nginx (Recommended)
```nginx
# /etc/nginx/sites-available/battlezone.conf

upstream vite_app {
  server 127.0.0.1:5173;
}

# Redirect HTTP to HTTPS
server {
  listen 80;
  server_name battlezone.example.com;
  return 301 https://$server_name$request_uri;
}

# HTTPS Server Block
server {
  listen 443 ssl http2;
  server_name battlezone.example.com;

  # SSL Certificate
  ssl_certificate /etc/letsencrypt/live/battlezone.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/battlezone.example.com/privkey.pem;
  
  # SSL Configuration
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;
  ssl_session_cache shared:SSL:10m;
  ssl_session_timeout 10m;

  # Security Headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-XSS-Protection "1; mode=block" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;

  # Gzip Compression
  gzip on;
  gzip_types text/plain text/css text/javascript application/json application/javascript;
  gzip_min_length 1000;
  gzip_vary on;

  # Cache Control Headers
  
  # HTML - Cache for 1 hour
  location ~* \.html$ {
    add_header Cache-Control "public, max-age=3600, must-revalidate";
    add_header X-Content-Type-Options "nosniff";
  }

  # Service Worker - No caching
  location /sw.js {
    add_header Cache-Control "public, max-age=0, must-revalidate";
    add_header Service-Worker-Allowed "/";
  }

  # Manifest - Cache for 1 day
  location /manifest.json {
    add_header Cache-Control "public, max-age=86400";
    add_header Content-Type "application/manifest+json";
  }

  # Assets - Cache for 1 year (with hash in filename)
  location ~* \.(js|css)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  # Images & WebP - Cache for 30 days
  location ~* \.(jpg|jpeg|png|gif|ico|webp|svg)$ {
    add_header Cache-Control "public, max-age=2592000, immutable";
    add_header X-Content-Type-Options "nosniff";
  }

  # Fonts - Cache for 1 year
  location ~* \.(woff|woff2|ttf|otf|eot)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  # API - No caching
  location /api/ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    proxy_pass http://vite_app;
  }

  # Proxy all requests to Vite dev server
  location / {
    proxy_pass http://vite_app;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Gzip
    proxy_set_header Accept-Encoding gzip;
  }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/battlezone.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Apache
```apache
# .htaccess or apache config

<IfModule mod_ssl.c>
  <VirtualHost *:443>
    ServerName battlezone.example.com
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/battlezone.example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/battlezone.example.com/privkey.pem
  </VirtualHost>
</IfModule>

# Redirect HTTP to HTTPS
<VirtualHost *:80>
  ServerName battlezone.example.com
  Redirect permanent / https://battlezone.example.com/
</VirtualHost>

# Enable modules
a2enmod ssl
a2enmod headers
a2enmod rewrite
a2enmod deflate

# Cache Control Headers
<IfModule mod_headers.c>
  # HTML
  <FilesMatch "\.html$">
    Header set Cache-Control "public, max-age=3600, must-revalidate"
  </FilesMatch>

  # Service Worker
  <FilesMatch "^sw\.js$">
    Header set Cache-Control "public, max-age=0, must-revalidate"
  </FilesMatch>

  # Assets (JS, CSS)
  <FilesMatch "\.(js|css)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>

  # Images
  <FilesMatch "\.(jpg|jpeg|png|gif|ico|webp|svg)$">
    Header set Cache-Control "public, max-age=2592000, immutable"
  </FilesMatch>

  # Fonts
  <FilesMatch "\.(woff|woff2|ttf|otf|eot)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>

  # Security Headers
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
  Header set Strict-Transport-Security "max-age=31536000; includeSubDomains"
</IfModule>

# Gzip Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/plain
  AddOutputFilterByType DEFLATE text/html
  AddOutputFilterByType DEFLATE text/xml
  AddOutputFilterByType DEFLATE text/css
  AddOutputFilterByType DEFLATE text/javascript
  AddOutputFilterByType DEFLATE application/json
  AddOutputFilterByType DEFLATE application/javascript
</IfModule>
```

### Docker
```dockerfile
# Dockerfile

FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production image
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTPS port
EXPOSE 443 80

CMD ["nginx", "-g", "daemon off;"]
```

```dockerfile
# Build & Run
docker build -t battlezone-pwa .
docker run -p 443:443 -p 80:80 battlezone-pwa
```

### Vercel (Easy Option)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Environment variables in vercel.json:
{
  "env": {
    "VITE_NODE_ENV": "production"
  },
  "headers": [
    {
      "source": "/(.*).js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
      ]
    }
  ]
}
```

---

## 🧪 Testing Offline Mode

### Chrome DevTools
1. **Network Simulation**:
   - Open DevTools (F12)
   - Go to Network tab
   - Throttle dropdown → Select "Offline"
   - Refresh page
   - App should work fully

2. **Service Worker Status**:
   - DevTools → Application tab
   - Service Workers section
   - Verify "sw.js" has status "running"
   - Check "Offline" box in checkbox

3. **Cache Storage**:
   - DevTools → Application → Cache Storage
   - View all cached files
   - Verify assets are cached

### Testing Installation
```bash
# Build for production
npm run build

# Serve locally
npx serve -s dist

# Open in browser at http://localhost:3000
# Install prompt should appear (if on HTTPS)
```

---

## 🔍 Verification Checklist

### After Deployment:

- [ ] HTTPS is working (green lock in browser)
- [ ] Service worker registered (`/sw.js` loads)
- [ ] Install prompt appears on first visit
- [ ] App installs successfully
- [ ] Offline mode works (test with DevTools)
- [ ] Cache headers correct (check Response headers)
- [ ] Icons display correctly
- [ ] Manifest.json accessible
- [ ] No console errors
- [ ] Security headers present

### Test Commands:
```bash
# Check HTTPS
curl -I https://battlezone.example.com

# Verify Service Worker
curl https://battlezone.example.com/sw.js

# Check manifest
curl https://battlezone.example.com/manifest.json

# Test offline with curl
curl --offline https://battlezone.example.com
```

---

## 📊 Performance Optimization

### Bundle Size Check
```bash
npm run build
# Check dist folder size
du -sh dist/
```

### Lighthouse Audit
```bash
# Install Lighthouse CLI
npm i -g lighthouse

# Run audit
lighthouse https://battlezone.example.com --view
```

### Monitor Performance
- Use Chrome DevTools Lighthouse
- Check Network requests
- Monitor Cache Storage growth
- Track Install prompts

---

## 🚨 Troubleshooting

### HTTPS Not Working
```bash
# Check certificate validity
openssl s_client -connect battlezone.example.com:443

# Verify certificate chain
certbot certificates
```

### Service Worker Not Registering
```bash
# Check service worker file exists
curl https://battlezone.example.com/sw.js

# Force re-registration
# JavaScript: navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(reg => reg.unregister()))
```

### Install Prompt Not Showing
- Must be HTTPS
- Must have valid manifest.json
- Must have service worker
- Must not be already installed
- Check: `chrome://web-app-internals/`

---

## 🔄 Updates & Maintenance

### Update Service Worker
```bash
# Increment CACHE_VERSION in /public/sw.js
const CACHE_VERSION = 'v2'

# Rebuild
npm run build

# Deploy to server
# Users will see update notification
```

### Monitor Errors
```javascript
// Add error monitoring (e.g., Sentry)
navigator.serviceWorker.ready.then(reg => {
  reg.update().catch(error => {
    console.error('SW update check failed:', error)
    // Send to error tracking service
  })
})
```

---

## 📚 Additional Resources

- [PWA Checklist](https://web.dev/pwa-checklist/)
- [HTTPS Setup Guide](https://letsencrypt.org/getting-started/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

**Production Deployment Complete! 🚀**

Your BattleZone 3D PWA is ready for production with:
- ✅ Full HTTPS support
- ✅ Proper cache headers
- ✅ Offline functionality
- ✅ High performance
- ✅ Security best practices
