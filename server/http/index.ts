import { mkdir } from 'node:fs/promises';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { dataDir, dbPath, port } from '../config.ts';
import { openStudyStore } from '../store/index.ts';
import { createApp } from './app.ts';

await mkdir(dataDir, { recursive: true, mode: 0o700 });
const store = openStudyStore(dbPath);
const app = createApp(store, dataDir);
app.use('/*', serveStatic({ root: './dist' }));
app.get('*', serveStatic({ path: './dist/index.html' }));

serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, info => {
  console.log(`Anki listening on http://127.0.0.1:${info.port}`);
});
