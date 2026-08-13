import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(), // Fixed: Removed the content option object
  ],
  build: {
    sourcemap: mode !== 'production',
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  server: {
    port: 5174,
    strictPort: true,
  },
}));
