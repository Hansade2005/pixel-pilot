# PWA (Progressive Web App) Implementation

## 📦 What's Included

This implementation adds complete Progressive Web App support to your Next.js application, making it installable, offline-capable, and faster across all devices.

## ✨ Features Implemented

### 1. **Service Worker & Caching**
- Automatic caching of static assets (JS, CSS, images, fonts)
- Smart caching strategies:
  - `CacheFirst` for Google Fonts
  - `StaleWhileRevalidate` for assets
  - `NetworkFirst` for API calls and pages
- Offline fallback support

### 2. **Web App Manifest**
- Located at: `/public/manifest.json`
- Includes:
  - App name, description, icons
  - Theme colors (dark mode optimized)
  - Display mode (standalone)
  - App shortcuts for quick actions
  - Screenshot metadata

### 3. **Install Prompt**
- Custom install banner (`components/pwa-install-prompt.tsx`)
- Beautiful gradient UI
- Dismissible with localStorage persistence
- Automatic detection of install capability

### 4. **Update Notifications**
- Smart update detection (`components/pwa-update-prompt.tsx`)
- User-friendly update prompt
- Seamless update flow with automatic reload

### 5. **Offline Indicator**
- Real-time online/offline status (`components/offline-indicator.tsx`)
- Visual feedback when connection is lost/restored
- Auto-hiding notifications

### 6. **Custom Hook**
- `hooks/use-pwa.ts` provides:
  - `isInstallable` - Check if app can be installed
  - `isInstalled` - Check if app is already installed
  - `isOnline` - Network status
  - `install()` - Programmatic install trigger

## 📱 Icon Requirements

You need to create app icons in these sizes and place them in `/public/icons/`:

### Required Sizes:
- 72x72 - `icon-72x72.png`
- 96x96 - `icon-96x96.png`
- 128x128 - `icon-128x128.png`
- 144x144 - `icon-144x144.png`
- 152x152 - `icon-152x152.png` (Apple Touch)
- 180x180 - `icon-180x180.png` (Apple Touch)
- 192x192 - `icon-192x192.png` (Android)
- 384x384 - `icon-384x384.png`
- 512x512 - `icon-512x512.png` (Android splash)

### Maskable Icons (Android Adaptive):
- 192x192 - `icon-maskable-192x192.png`
- 512x512 - `icon-maskable-512x512.png`

### Optional Screenshots:
- Desktop: `screenshots/desktop.png` (1280x720)
- Mobile: `screenshots/mobile.png` (750x1334)

## 🛠️ Icon Generation

### Option 1: Using Online Tools
1. Visit [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
2. Upload your logo (512x512 or higher recommended)
3. Generate all sizes
4. Download and place in `/public/icons/`

### Option 2: Using Sharp (Node.js)
Create a script to generate icons:

```bash
pnpm add -D sharp
```

```javascript
// scripts/generate-icons.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];
const inputImage = 'public/logo.png'; // Your source logo
const outputDir = 'public/icons';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

sizes.forEach(size => {
  sharp(inputImage)
    .resize(size, size)
    .toFile(path.join(outputDir, `icon-${size}x${size}.png`))
    .then(() => console.log(`Generated ${size}x${size}`));
});

// Generate maskable icons with padding
[192, 512].forEach(size => {
  sharp(inputImage)
    .resize(size * 0.8, size * 0.8)
    .extend({
      top: size * 0.1,
      bottom: size * 0.1,
      left: size * 0.1,
      right: size * 0.1,
      background: { r: 99, g: 102, b: 241, alpha: 1 } // Theme color
    })
    .toFile(path.join(outputDir, `icon-maskable-${size}x${size}.png`))
    .then(() => console.log(`Generated maskable ${size}x${size}`));
});
```

Run: `node scripts/generate-icons.js`

## 🚀 Build & Deploy

### Development
```bash
pnpm dev
```
PWA is disabled in development mode for easier debugging.

### Production Build
```bash
pnpm build
pnpm start
```

The service worker will be generated automatically during build.

### Generated Files
After build, these files will appear in `/public/`:
- `sw.js` - Service worker
- `workbox-*.js` - Workbox runtime
- `sw.js.map` - Source maps

⚠️ These are auto-generated and already ignored in `.gitignore`

## 📋 Testing Your PWA

### Local Testing
1. Build the production version: `pnpm build`
2. Start production server: `pnpm start`
3. Open `http://localhost:3000` in Chrome
4. Open DevTools → Application → Service Workers
5. Check "Offline" to test offline functionality

### Chrome DevTools Audit
1. Open DevTools → Lighthouse
2. Select "Progressive Web App" category
3. Click "Generate report"
4. Aim for score > 90

### Install Testing
- **Desktop**: Look for install icon in address bar
- **Android Chrome**: "Add to Home Screen" in menu
- **iOS Safari**: "Add to Home Screen" in share menu

### Manifest Validation
Visit: `https://manifest-validator.appspot.com/`
Enter your site URL to validate the manifest

## 🎨 Customization

### Change Theme Colors
Edit `/public/manifest.json`:
```json
{
  "theme_color": "#YOUR_COLOR",
  "background_color": "#YOUR_COLOR"
}
```

Also update in `app/layout.tsx`:
```tsx
<meta name="theme-color" content="#YOUR_COLOR" />
```

### Modify Caching Strategy
Edit `next.config.mjs` → `runtimeCaching` array:

```javascript
{
  urlPattern: /\/api\/.*$/i,
  handler: 'NetworkFirst', // or CacheFirst, StaleWhileRevalidate
  options: {
    cacheName: 'api-cache',
    expiration: {
      maxEntries: 16,
      maxAgeSeconds: 5 * 60 // 5 minutes
    }
  }
}
```

### Custom Offline Page
Create `public/offline.html` and update service worker to serve it when offline.

## 🔧 Troubleshooting

### Service Worker Not Updating
1. Clear site data in DevTools
2. Hard refresh (Ctrl+Shift+R)
3. Check "Update on reload" in DevTools → Application → Service Workers

### Install Prompt Not Showing
- Must be HTTPS (or localhost)
- User must visit site at least twice with 5 minutes gap
- User hasn't dismissed it before
- App meets installability criteria

### Icons Not Loading
- Check file paths match manifest.json
- Ensure files exist in `/public/icons/`
- Verify image format is PNG
- Check browser console for 404 errors

## 📊 PWA Metrics

Monitor these in production:
- Install rate
- Offline usage
- Cache hit rate
- Service worker activation time

### Google Analytics Integration
```javascript
// Add to service worker for PWA tracking
self.addEventListener('install', () => {
  gtag('event', 'pwa_install');
});
```

## 🌐 Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Install | ✅ | ✅ | ✅* | ✅ |
| Offline | ✅ | ✅ | ✅ | ✅ |
| Push | ✅ | ✅ | ❌ | ✅ |

*iOS Safari requires manual "Add to Home Screen"

## 📚 Resources

- [Web.dev PWA Guide](https://web.dev/progressive-web-apps/)
- [MDN PWA Documentation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Next.js PWA Plugin](https://github.com/shadowwalker/next-pwa)
- [Workbox Documentation](https://developers.google.com/web/tools/workbox)

## 🎯 Next Steps

1. **Generate Icons**: Create all required icon sizes
2. **Add Screenshots**: Capture and add app screenshots
3. **Test Install**: Test installation on multiple devices
4. **Lighthouse Audit**: Run audit and fix any issues
5. **Analytics**: Add PWA event tracking
6. **Push Notifications**: Implement web push (optional)

---

**Need Help?** Check the official [Next PWA documentation](https://github.com/shadowwalker/next-pwa) or open an issue.
