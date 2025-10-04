# SmartPresence - HTTPS Setup Guide

## 🔐 Running with HTTPS

SmartPresence is now configured to run with HTTPS for better security and to support modern web APIs like camera and geolocation.

### Quick Start (HTTPS)

```bash
# Run full application with HTTPS
npm run dev:fullstack:secure

# Or run individually:
npm run dev:https        # Frontend with HTTPS
npm run dev:backend      # Backend with HTTP (proxied through frontend)
```

### Why HTTPS?

1. **Camera Access**: Modern browsers require HTTPS for camera/microphone access
2. **Geolocation**: GPS services work better with HTTPS
3. **Service Workers**: PWA features require HTTPS
4. **Security**: Encrypted communication between client and server

### Certificate Management

The app uses `vite-plugin-mkcert` to automatically generate trusted SSL certificates:

- Certificates are auto-generated on first run
- No manual certificate installation needed
- Works on localhost and 127.0.0.1

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev:https` | Frontend with HTTPS |
| `npm run dev:secure` | Same as above (alias) |
| `npm run dev:fullstack:secure` | Full app with HTTPS |
| `npm run preview --https` | Production preview with HTTPS |

### URLs

- **Frontend (HTTPS)**: https://localhost:5173
- **Backend (HTTP)**: http://localhost:3001 (proxied through frontend)
- **Health Check**: https://localhost:5173/api/health

### Troubleshooting

#### Certificate Warnings
If you see certificate warnings:
1. Click "Advanced" or "Continue anyway"
2. The certificates are self-signed but safe for development

#### Camera/GPS Not Working
1. Ensure you're using HTTPS (https://localhost:5173)
2. Allow camera/location permissions in browser
3. Check browser console for errors

#### CORS Issues
Backend is configured to accept requests from:
- http://localhost:5173
- https://localhost:5173
- http://127.0.0.1:5173  
- https://127.0.0.1:5173

## Production Deployment

For production, you'll need real SSL certificates:

1. **Using Let's Encrypt** (recommended)
2. **Using Cloudflare** (easiest)
3. **Using reverse proxy** (nginx/Apache)

Example nginx config:
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Security Notes

- Development certificates are not suitable for production
- Always use proper SSL certificates in production
- Consider implementing additional security headers
- Review CORS configuration for production use