import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Production bundle: minified + NO source maps, so the browser never
    // receives readable .jsx source (DevTools Sources shows only mangled JS).
    sourcemap: false,
    minify: 'esbuild',
  },
  server: {
    port: 3000,
    hmr: {
      overlay: false, // no vite error/code popup in the browser
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/legal': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3000,
    // Serve the built app as a single-origin production-style site.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/legal': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
});
