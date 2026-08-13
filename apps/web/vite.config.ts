import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['app-icon.svg'],
      manifest: {
        name: 'Attendity University Attendance',
        short_name: 'Attendity',
        description: 'Secure university QR attendance, analytics, and examination clearance.',
        theme_color: '#0B6B4F',
        background_color: '#F8FAFC',
        display: 'standalone',
        start_url: '/app',
        scope: '/',
        icons: [
          { src: '/app-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        importScripts: ['/push-handler.js'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
            method: 'GET',
          },
        ],
      },
    }),
  ],
  build: {
    sourcemap: mode !== 'production',
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query', 'axios'],
          motion: ['framer-motion'],
        },
      },
    },
  },
  server: { port: 5173, strictPort: true },
}));
