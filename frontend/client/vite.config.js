import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the PHP API runs separately; proxying keeps everything on one origin,
// matching production where server/router.php serves both.
const apiTarget = process.env.API_TARGET ?? 'http://127.0.0.1:8080';

// backend/ (the merged inventory-api) is a second, independent PHP service with its
// own origin — typically its own deployment in production (see ../../backend/README.md).
// This proxy only covers local dev; VITE_BACKEND_API_URL overrides the base URL the
// client actually calls (see src/lib/backendApi.js), so a production build can point
// at wherever backend/ is really deployed.
const backendApiTarget = process.env.BACKEND_API_TARGET ?? 'http://127.0.0.1:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: false },
      '/backend-api': {
        target: backendApiTarget,
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/backend-api/, '/api/v1'),
      },
    },
  },
  build: {
    sourcemap: false,
  },
});
