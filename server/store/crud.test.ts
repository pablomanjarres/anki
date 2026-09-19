import test from 'node:test';
import assert from 'node:assert/strict';
import { openStudyStore } from './index.ts';

const courseSource = { type: 'course' as const, id: 'c', title: 'Course', section: 'Week 1', excerpt: 'Fact one.', eligibleOn: '2026-09-01' };

test('manual cards need a source locator but no scheduled course date', () => {
  const store = openStudyStore();
  const deck = store.createDeck({ name: 'Personal', kind: 'custom' });
  const card = store.createCard({ deckId: deck.id, type: 'basic', front: 'Question', back: 'Answer', source: { type: 'manual', id: 'notes', title: 'My notes', section: 'p. 2' } });
  assert.equal(card.source.section, 'p. 2');
  assert.equal(store.getDailyQueue(new Date('2026-09-19T13:00:00Z')).cards[0]?.id, card.id);
  assert.equal(store.submitGeneratedCards({ runKey: 'manual', date: '2026-09-19', cards: [{ deckId: deck.id, type: 'basic', front: 'Generated?', back: 'No', source: { type: 'manual', id: 'n', title: 'Notes', section: 'p. 3' } }] }).rejected, 1);
  store.close();
});

test('editing retains card scheduling and deleting a deck removes its cards', () => {
  const store = openStudyStore();
  const deck = store.createDeck({ name: 'Old name', kind: 'course' });
  const card = store.createCard({ deckId: deck.id, type: 'basic', front: 'Old question', back: 'Answer', source: courseSource });
  const graded = store.gradeCard(card.id, 'mid', new Date('2026-09-19T13:00:00Z'));
  assert.equal(store.updateDeck(deck.id, { name: 'New name' }).name, 'New name');
  assert.equal(store.updateCard(card.id, { front: 'Better question' }).dueAt, graded.card.dueAt);
  assert.equal(store.searchCards('Better question')[0]?.id, card.id);
  assert.equal(store.deleteDeck(deck.id), true);
  assert.equal(store.getCard(card.id), null);
  store.close();
});

test('daily generation stops at five and retries are idempotent', () => {
  const store = openStudyStore();
  const deck = store.createDeck({ name: 'Course', kind: 'course' });
  const cards = Array.from({ length: 32 }, (_, i) => ({ deckId: deck.id, type: 'basic' as const, front: `Q${i}`, back: `A${i}`, source: courseSource }));
  const batch = { runKey: 'daily-1', date: '2026-09-19', cards };
  const first = store.submitGeneratedCards(batch);
  assert.equal(first.created, 5);
  assert.equal(first.paused, true);
  assert.equal(store.searchCards('Q').length, 5);
  assert.equal(store.submitGeneratedCards({ runKey: 'daily-2', date: '2026-09-19', cards: cards.slice(5) }).created, 0);
  assert.deepEqual(store.submitGeneratedCards(batch), first);
  store.close();
});


test('unreviewed pool blocks generation beyond thirty cards', () => {
  const store = openStudyStore();
  const deck = store.createDeck({ name: 'Course', kind: 'course' });
  for (let i = 0; i < 29; i++) store.createCard({ deckId: deck.id, type: 'basic', front: `Existing ${i}`, back: 'A', source: courseSource });
  const result = store.submitGeneratedCards({ runKey: 'pool', date: '2026-09-19', cards: [30, 31].map(i => ({ deckId: deck.id, type: 'basic' as const, front: `Generated ${i}`, back: 'A', source: courseSource })) });
  assert.equal(result.created, 1);
  assert.equal(result.paused, true);
  store.close();
});

test('book location checkpoints reject unread EPUB locations', () => {
  const store = openStudyStore();
  const deck = store.createDeck({ name: 'Book', kind: 'book' });
  store.upsertBook({ id: 'b', cortexBookId: 'cortex-b', title: 'Book', author: 'A', fileName: 'book.epub', fileType: 'epub' });
  store.setReadingLocation('b', 530);
  const source = { type: 'book' as const, id: 'b', title: 'Book', location: 531, excerpt: 'A passage' };
  assert.equal(store.submitGeneratedCards({ runKey: 'epub', date: '2026-09-19', cards: [{ deckId: deck.id, type: 'basic', front: 'Q', back: 'A', source }] }).rejected, 1);
  assert.equal(store.getBook('b')?.cortexBookId, 'cortex-b');
  assert.equal(store.getBook('b')?.currentLocation, 530);
  store.close();
});

test('EPUB highlight can cite a reached location without a PDF page', () => {
  const store = openStudyStore();
  store.upsertBook({ id: 'epub', title: 'Book', fileType: 'epub' });
  store.setReadingLocation('epub', 530);
  const highlight = store.addHighlight({ bookId: 'epub', location: 529, text: 'Read words' });
  assert.equal(highlight.location, 529);
  assert.equal(store.listHighlights('epub')[0]?.location, 529);
  assert.throws(() => store.addHighlight({ bookId: 'epub', location: 531, text: 'Unread words' }), /read/);
  store.close();
});
