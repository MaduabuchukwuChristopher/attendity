import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './app/providers.js';
import { router } from './routes/router.js';
import './styles/index.css';
import { registerSW } from 'virtual:pwa-register';

const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh: () => document.dispatchEvent(new Event('attendity:update-ready')),
});

// Promote the waiting PWA release instead of reloading the currently active cache.
document.addEventListener('attendity:apply-update', () => {
  void updateServiceWorker(true);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
