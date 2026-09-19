import { Hono } from 'hono';
import type { StudyStore } from '../store/index.ts';
import { registerCatalog } from './catalog.ts';
import { registerCards } from './cards.ts';
import { registerReviews } from './reviews.ts';
import { registerBooks } from './books.ts';

export function createApp(store: StudyStore, dataDir: string) {
  const app = new Hono();
  app.onError((error, c) => {
    const badInput = /required|invalid|unknown|not found|must|cannot|limit|due|already|source|checkpoint|excerpt|page|location|file|cloze/i.test(error.message);
    if (!badInput) console.error('Anki API error:', error);
    return c.json({ error: badInput ? error.message : 'Anki could not complete the request.' }, badInput ? 400 : 500);
  });
  registerCatalog(app, store);
  registerCards(app, store);
  registerReviews(app, store);
  registerBooks(app, store, dataDir);
  app.notFound(c => c.json({ error: 'Route not found' }, 404));
  return app;
}
