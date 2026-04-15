import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// NOTE: GEMINI_API_KEY is intentionally NOT injected here.
// All Gemini API calls are handled server-side via /api/gemini (Vercel serverless function).
// The key is set only in Vercel Environment Variables and never reaches the browser.
export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
