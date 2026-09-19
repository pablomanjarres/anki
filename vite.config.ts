import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3460,
    proxy: { '/api': 'http://127.0.0.1:3464' },
  },
});
