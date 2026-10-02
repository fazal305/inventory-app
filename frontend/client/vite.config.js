import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the PHP API runs separately; proxying keeps everything on one origin,
// matching production where server/router.php serves both.
const apiTarget = process.env.API_TARGET ?? 'http://127.0.0.1:8080';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: false },
    },
  },
  build: {
    sourcemap: false,
  },
});
