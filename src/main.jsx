import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './i18n/index.js'; // initialize translations
import './styles/global.css';
import './styles/typography.css';
import './styles/animations.css';

async function clearDevServiceWorkers() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));

  if ('caches' in window) {
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
  }
}

// Register Service Worker for production PWA only.
// In local demo/dev, clear it so Chrome profiles do not keep stale dashboard code.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (import.meta.env.DEV) {
      clearDevServiceWorkers().catch((error) => {
        console.log('Dev SW/cache cleanup failed: ', error);
      });
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.log('SW registration failed: ', error);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
