import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Local Database Plugin ---
// This acts as a centralized "backend" so different Chrome Profiles can share data
const LOCAL_DB_FILE = path.join(__dirname, '.local-db.json');
const EMPTY_LOCAL_DB = { users: {}, farmers: [], queries: [], activityEvents: [] };

function readLocalDb() {
  try {
    if (!fs.existsSync(LOCAL_DB_FILE)) return { ...EMPTY_LOCAL_DB };
    return { ...EMPTY_LOCAL_DB, ...JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf8')) };
  } catch {
    return { ...EMPTY_LOCAL_DB };
  }
}

function writeLocalDb(db) {
  fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(db, null, 2));
}

function normalizePhone(phone = '') {
  const digits = String(phone).replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
}

function mergeListByKey(current = [], incoming = [], getKey) {
  const records = new Map();
  current.forEach((item) => records.set(getKey(item), item));
  incoming.forEach((item) => records.set(getKey(item), { ...records.get(getKey(item)), ...item }));
  return Array.from(records.values()).filter(Boolean);
}

let localDb = readLocalDb();
const localDatabasePlugin = (openAiKey) => ({
  name: 'local-db-api',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/api/realtime/connect' && req.method === 'POST') {
        if (!openAiKey) {
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Realtime voice is not configured. Add OPENAI_API_KEY to .env and restart the dev server.' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { sdp, session } = JSON.parse(body);
            if (!sdp || !session) throw new Error('Missing WebRTC offer.');

            const form = new FormData();
            form.append('sdp', new Blob([sdp], { type: 'application/sdp' }), 'offer.sdp');
            form.append('session', new Blob([JSON.stringify(session)], { type: 'application/json' }), 'session.json');

            const upstream = await fetch('https://api.openai.com/v1/realtime/calls', {
              method: 'POST',
              headers: { Authorization: `Bearer ${openAiKey}` },
              body: form,
            });
            const answer = await upstream.text();
            if (!upstream.ok) {
              res.statusCode = upstream.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: answer || 'Unable to create a Realtime session.' }));
              return;
            }

            res.statusCode = 201;
            res.setHeader('Content-Type', 'application/sdp');
            res.end(answer);
          } catch (error) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: error.message || 'Invalid Realtime request.' }));
          }
        });
        return;
      }

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
              if (parsed.farmers) {
                localDb.farmers = mergeListByKey(localDb.farmers, parsed.farmers, (farmer) => normalizePhone(farmer.phone) || farmer.id);
              }
              if (parsed.queries) {
                localDb.queries = mergeListByKey(localDb.queries, parsed.queries, (query) => query.id)
                  .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
              }
              if (parsed.activityEvents) {
                localDb.activityEvents = mergeListByKey(localDb.activityEvents, parsed.activityEvents, (event) => event.id)
                  .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                  .slice(0, 500);
              }
              writeLocalDb(localDb);
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
  plugins: [
    react(),
    localDatabasePlugin(env.OPENAI_API_KEY),
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
  ],
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
    // HTTP keeps local WebSocket MQTT (ws://localhost:8080) available in Chrome.
    https: false,
  },
  };
});
