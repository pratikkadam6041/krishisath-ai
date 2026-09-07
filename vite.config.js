import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getOptionalBasicSslPlugin() {
  try {
    const mod = require('@vitejs/plugin-basic-ssl');
    const pluginFactory = mod.default ?? mod;
    return pluginFactory();
  } catch {
    return null;
  }
}

const basicSslPlugin = getOptionalBasicSslPlugin();

// --- Local Database Plugin ---
// This acts as a centralized "backend" so different Chrome Profiles can share data
let localDb = { users: {} };
const localDatabasePlugin = () => ({
  name: 'local-db-api',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/api/db') {
        res.setHeader('Content-Type', 'application/json');
        
        if (req.method === 'GET') {
          res.end(JSON.stringify(localDb));
          return;
        }
        
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              if (parsed.users) {
                localDb.users = { ...localDb.users, ...parsed.users };
              }
              res.end(JSON.stringify({ success: true }));
            } catch (e) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
          });
          return;
        }
      }
      next();
    });
  }
});

export default defineConfig({
  plugins: [
    react(),
    basicSslPlugin,
    localDatabasePlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'KrishiSarth AI',
        short_name: 'KrishiSarth',
        description: 'स्मार्ट शेती — AI-powered farm management',
        theme_color: '#2E7D32',
        background_color: '#F1F8E9',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'gstatic-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
      devOptions: { enabled: true },
    }),
  ].filter(Boolean),
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['mqtt', 'zustand', 'react-i18next', 'i18next', 'recharts', 'lucide-react'],
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    https: Boolean(basicSslPlugin),
  },
});
