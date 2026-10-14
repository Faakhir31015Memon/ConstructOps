import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { LanguageProvider } from './i18n/LanguageContext.jsx';
import { initAntiInspect } from './utils/antiInspect.js';
import { startOfflineSync } from './utils/offlineQueue.js';
import './index.css';

// Activate security protections against DevTools / Inspect (all modes)
initAntiInspect();

// Replay attendance captured while the site had no signal.
startOfflineSync();

// The offline app shell is only registered for real builds — a dev-time service
// worker would cache stale modules and confuse hot reload.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline mode degrades to plain network use */
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>,
);
