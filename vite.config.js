import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sqliteBackendPlugin } from './server/vitePluginDb.js';

import path from 'node:path';

export default defineConfig({
  plugins: [react(), sqliteBackendPlugin()],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        admin: path.resolve(__dirname, 'admin.html'),
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          xlsx: ['xlsx'],
          pdf: ['jspdf', 'jspdf-autotable'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  server: {
    port: 5175,
    host: true,
    allowedHosts: true,
    cors: true,
  },
});
