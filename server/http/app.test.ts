import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import { openStudyStore } from '../store/index.ts';
import { createApp } from './app.ts';

test('HTTP flow creates a cited card, reviews it, and undoes the grade', async () => {
  const store = openStudyStore();
  const app = createApp(store, os.tmpdir());
  try {
    const deckResponse = await app.request('/api/decks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Test course' }) });
    assert.equal(deckResponse.status, 201);
    const deck = await deckResponse.json() as { id: string };
    const cardResponse = await app.request('/api/cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      deckId: deck.id, type: 'basic', question: 'What is a vector?', answer: 'A quantity with magnitude and direction', sourceTitle: 'Lecture 1', sourceLocator: 'Page 3',
    }) });
    assert.equal(cardResponse.status, 201);
    const card = await cardResponse.json() as { id: string; sourceLocator: string };
    assert.equal(card.sourceLocator, 'Page 3');
    const queue = await (await app.request('/api/queue')).json() as { cards: Array<{ id: string }> };
    assert.equal(queue.cards[0]?.id, card.id);
    const gradeResponse = await app.request('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cardId: card.id, rating: 'ez' }) });
    assert.equal(gradeResponse.status, 200);
    const grade = await gradeResponse.json() as { reviewId: string };
    assert.equal((await app.request('/api/reviews/undo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reviewId: grade.reviewId }) })).status, 204);
    assert.equal(store.getReviewHistory(card.id).length, 0);
  } finally { store.close(); }
});

test('HTTP book upload extracts EPUB and saves a bounded checkpoint', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'anki-http-'));
  const store = openStudyStore();
  const app = createApp(store, dir);
  try {
    const created = await app.request('/api/books', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Sample Book' }) });
    assert.equal(created.status, 201);
    const book = await created.json() as { id: string };
    const zip = new JSZip();
    zip.file('META-INF/container.xml', '<container><rootfiles><rootfile full-path="book.opf"/></rootfiles></container>');
    zip.file('book.opf', '<package><manifest><item id="one" href="chapter.xhtml"/></manifest><spine><itemref idref="one"/></spine></package>');
    zip.file('chapter.xhtml', '<html><body><h1>Start</h1><p>This paragraph contains enough useful study material to make one grounded passage.</p></body></html>');
    const form = new FormData();
    form.set('file', new File([await zip.generateAsync({ type: 'uint8array' })], 'sample.epub', { type: 'application/epub+zip' }));
    assert.equal((await app.request(`/api/books/${book.id}/file`, { method: 'POST', body: form })).status, 200);
    const progress = await app.request(`/api/books/${book.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: '1' }) });
    assert.equal(progress.status, 200);
    assert.equal((await progress.json() as { location: string }).location, '1');
  } finally { store.close(); await rm(dir, { recursive: true, force: true }); }
});

test('cloze expression survives an edit to its source metadata', async () => {
  const store = openStudyStore();
  const app = createApp(store, os.tmpdir());
  try {
    const deck = await (await app.request('/api/decks', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Cloze deck' }) })).json() as { id: string };
    const created = await app.request('/api/cards', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deckId: deck.id, type: 'cloze', question: 'What model is this?', answer: '4+1',
        clozeText: 'The {{c1::4+1}} model represents architecture views.', sourceTitle: 'Lecture', sourceLocator: 'Slide 4' }) });
    assert.equal(created.status, 201);
    const card = await created.json() as { id: string; clozeText: string };
    assert.equal(card.clozeText, 'The {{c1::4+1}} model represents architecture views.');
    const edited = await app.request(`/api/cards/${card.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceLocator: 'Slide 5' }) });
    assert.equal((await edited.json() as { clozeText: string }).clozeText, card.clozeText);
    const queue = await (await app.request('/api/queue')).json() as { cards: Array<{ clozeText: string }> };
    assert.equal(queue.cards[0]?.clozeText, card.clozeText);
  } finally { store.close(); }
});
