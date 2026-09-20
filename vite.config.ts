import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3460,
    proxy: { '/api': process.env.ANKI_DEV_API_ORIGIN ?? 'http://127.0.0.1:3464' },
  },
});
