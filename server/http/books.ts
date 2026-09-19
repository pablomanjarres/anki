import { randomUUID } from 'node:crypto';
import type { Hono } from 'hono';
import { loadCortexSnapshot } from '../cortex/index.ts';
import { removeBookFile, saveBookFile } from '../books/index.ts';
import type { StudyStore } from '../store/index.ts';
import { bookView } from './format.ts';
import { object, optional, positiveInteger, required } from './input.ts';

export function registerBooks(app: Hono, store: StudyStore, dataDir: string) {
  app.get('/api/books', c => c.json({ books: store.listBooks().map(book => bookView(book, store)) }));
  app.post('/api/books', async c => {
    const body = object(await c.req.json());
    const cortexBookId = optional(body.cortexBookId);
    if (cortexBookId) {
      const snapshot = await loadCortexSnapshot();
      if (!snapshot.books.some(book => book.id === cortexBookId)) throw new Error('Cortex book ID was not found');
    }
    const book = store.upsertBook({ id: randomUUID(), title: required(body.title, 'Title'),
      author: optional(body.author), cortexBookId });
    return c.json(bookView(book, store), 201);
  });
  app.patch('/api/books/:id', async c => {
    const id = c.req.param('id');
    if (!store.getBook(id)) return c.json({ error: 'Book not found' }, 404);
    const body = object(await c.req.json());
    if (body.currentPage != null && body.currentPage !== '') store.setReadingProgress(id, positiveInteger(body.currentPage, 'Page'));
    if (body.location != null && body.location !== '') store.setReadingLocation(id, positiveInteger(body.location, 'Location'));
    return c.json(bookView(store.getBook(id)!, store));
  });
  app.post('/api/books/:id/file', async c => {
    const id = c.req.param('id');
    const book = store.getBook(id);
    if (!book) return c.json({ error: 'Book not found' }, 404);
    if (Number(c.req.header('content-length') ?? 0) > 52 * 1024 * 1024) throw new Error('Book file exceeds 50 MB');
    const form = await c.req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new Error('PDF or EPUB file is required');
    const saved = await saveBookFile(dataDir, id, file.name, Buffer.from(await file.arrayBuffer()));
    const updated = store.upsertBook({ id, title: book.title, filePath: saved.storedPath,
      fileType: saved.format as 'pdf' | 'epub', fileName: file.name });
    return c.json(bookView(updated, store));
  });
  app.post('/api/books/:id/highlights', async c => {
    const id = c.req.param('id');
    const book = store.getBook(id);
    if (!book) return c.json({ error: 'Book not found' }, 404);
    const body = object(await c.req.json());
    const locator = required(body.locator, 'Page or location');
    const number = positiveInteger(locator.replace(/^(?:page|p\.?|location|loc\.?)\s*/i, ''), 'Page or location');
    const place = book.fileType === 'epub' || /^(?:location|loc)/i.test(locator) ? { location: number } : { page: number };
    store.addHighlight({ bookId: id, text: required(body.text, 'Passage'), note: optional(body.note), ...place });
    return c.body(null, 204);
  });
  app.delete('/api/books/:id', async c => {
    const id = c.req.param('id');
    if (!store.deleteBook(id)) return c.json({ error: 'Book not found' }, 404);
    await removeBookFile(dataDir, id);
    return c.body(null, 204);
  });
}
