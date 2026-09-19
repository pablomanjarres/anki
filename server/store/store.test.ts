import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { openStudyStore } from './index.ts';

const openFixed = () => openStudyStore(':memory:', () => new Date('2026-09-19T12:00:00Z'));

const at = (day: string, hour = '13:00:00') => new Date(`${day}T${hour}Z`);
const source = (eligibleOn = '2026-09-18') => ({ type: 'course' as const, id: 'calc', title: 'Cálculo III', section: 'Semana 6, p. 4', excerpt: 'El gradiente indica la dirección de máximo crecimiento.', eligibleOn });
function withDeck() {
  const store = openFixed();
  const deck = store.createDeck({ name: 'Cálculo III', kind: 'course', cortexId: 'calc' });
  return { store, deck };
}

test('Bogota local date determines eligibility and keeps future material out of queue', () => {
  const { store, deck } = withDeck();
  const card = store.createCard({ deckId: deck.id, type: 'basic', front: '¿Qué indica el gradiente?', back: 'Máximo crecimiento.', source: source('2026-09-20') });
  assert.equal(store.getDailyQueue(at('2026-09-20', '03:00:00')).cards.length, 0); // Sep 19 in Bogotá
  assert.equal(store.getDailyQueue(at('2026-09-20', '05:00:00')).cards[0]?.id, card.id);
  store.close();
});

test('due cards go first, five new cards at most, and overdue remains visible', () => {
  const { store, deck } = withDeck();
  for (let i = 0; i < 8; i++) store.createCard({ deckId: deck.id, type: 'basic', front: `Question ${i}`, back: `Answer ${i}`, source: source() });
  const first = store.getDailyQueue(at('2026-09-19'));
  assert.equal(first.cards.length, 5);
  store.gradeCard(first.cards[0]!.id, 'mid', at('2026-09-19'));
  const tomorrow = store.getDailyQueue(at('2026-09-20'));
  assert.equal(tomorrow.cards[0]?.id, first.cards[0]?.id);
  assert.equal(tomorrow.newCount, 5);
  assert.equal(tomorrow.dueCount, 1);
  store.close();
});

test('thirty distinct reviewed cards cap the day while due backlog stays counted', () => {
  const { store, deck } = withDeck();
  for (let i = 0; i < 34; i++) {
    const card = store.createCard({ deckId: deck.id, type: 'basic', front: `Q${i}`, back: `A${i}`, source: source('2026-09-16') });
    store.gradeCard(card.id, 'hard', at(i < 17 ? '2026-09-17' : '2026-09-18'));
  }
  const queue = store.getDailyQueue(at('2026-09-19'));
  assert.equal(queue.cards.length, 30);
  assert.equal(queue.backlogCount, 4);
  for (const card of queue.cards) store.gradeCard(card.id, 'hard', at('2026-09-19'));
  const capped = store.getDailyQueue(at('2026-09-19'));
  assert.equal(capped.cards.length, 0);
  assert.equal(capped.reviewedDistinct, 30);
  assert.equal(capped.backlogCount, 4);
  assert.equal(capped.remaining, 0);
  assert.throws(() => store.gradeCard(capped.backlog[0]!.id, 'mid', at('2026-09-19')), /Daily review limit/);
  store.close();
});

test('five ratings schedule, EZ extends Easy, and undo restores the previous state', () => {
  for (const rating of ['again', 'hard', 'mid', 'easy', 'ez'] as const) {
    const { store, deck } = withDeck();
    const card = store.createCard({ deckId: deck.id, type: 'basic', front: 'Q', back: 'A', source: source() });
    const reviewed = store.gradeCard(card.id, rating, at('2026-09-19'));
    assert.equal(reviewed.rating, rating);
    assert.ok(new Date(reviewed.card.dueAt).getTime() > at('2026-09-19').getTime());
    if (rating === 'ez') {
      const easyStore = openFixed();
      const easyDeck = easyStore.createDeck({ name: 'D', kind: 'course' });
      const easyCard = easyStore.createCard({ deckId: easyDeck.id, type: 'basic', front: 'Q', back: 'A', source: source() });
      const easy = easyStore.gradeCard(easyCard.id, 'easy', at('2026-09-19'));
      assert.ok(new Date(reviewed.card.dueAt).getTime() > new Date(easy.card.dueAt).getTime());
      easyStore.close();
    }
    assert.equal(store.undoLastGrade(at('2026-09-19'))?.id, card.id);
    assert.equal(store.getCard(card.id)?.dueAt, card.dueAt);
    store.close();
  }
});

test('generated submissions are idempotent and reject uncited, future, and unread-page cards', () => {
  const { store, deck } = withDeck();
  store.upsertBook({ id: 'book-1', title: 'Book', currentPage: 84, totalPages: 200 });
  const valid = { deckId: deck.id, type: 'basic' as const, front: 'What is x?', back: 'y', source: source() };
  const batch = { runKey: '2026-09-19:daily', date: '2026-09-19', cards: [valid, valid, { ...valid, front: 'Future', source: source('2026-09-20') }, { ...valid, front: 'No citation', source: { ...source(), excerpt: '' } }, { ...valid, front: 'Unread', source: { type: 'book' as const, id: 'book-1', title: 'Book', page: 85, excerpt: 'Words.' } }] };
  const result = store.submitGeneratedCards(batch);
  assert.equal(result.created, 1);
  assert.equal(result.duplicates, 1);
  assert.equal(result.rejected, 3);
  assert.deepEqual(store.submitGeneratedCards(batch), result);
  assert.equal(store.searchCards('x').length, 1);
  store.close();
});

test('book checkpoint and highlight persist across reopen', () => {
  const path = `/tmp/anki-store-test-${crypto.randomUUID()}.sqlite`;
  let store = openStudyStore(path);
  store.upsertBook({ id: 'b', title: 'Book', totalPages: 100 });
  store.setReadingProgress('b', 42, at('2026-09-19'));
  store.addHighlight({ bookId: 'b', page: 42, text: 'A marked passage' });
  store.close();
  store = openStudyStore(path);
  assert.equal(store.getBook('b')?.currentPage, 42);
  assert.equal(store.listHighlights('b')[0]?.text, 'A marked passage');
  store.close();
});


test('undo requires the latest matching review id', () => {
  const { store, deck } = withDeck();
  const a = store.createCard({ deckId: deck.id, type: 'basic', front: 'A?', back: 'A', source: source() });
  const b = store.createCard({ deckId: deck.id, type: 'basic', front: 'B?', back: 'B', source: source() });
  const one = store.gradeCard(a.id, 'mid', at('2026-09-19'));
  const two = store.gradeCard(b.id, 'mid', at('2026-09-19'));
  assert.equal(store.undoLastGrade(at('2026-09-19'), one.reviewId), null);
  assert.equal(store.undoLastGrade(at('2026-09-19'), two.reviewId)?.id, b.id);
  assert.deepEqual(store.getReviewHistory().map(event => event.cardId), [a.id]);
  store.close();
});

test('review stats include the recent week, streak, and upcoming due days', () => {
  const { store, deck } = withDeck();
  const a = store.createCard({ deckId: deck.id, type: 'basic', front: 'A?', back: 'A', source: source('2026-09-16') });
  const b = store.createCard({ deckId: deck.id, type: 'basic', front: 'B?', back: 'B', source: source('2026-09-16') });
  store.gradeCard(a.id, 'hard', at('2026-09-17'));
  store.gradeCard(b.id, 'hard', at('2026-09-18'));
  const stats = store.getReviewStats(at('2026-09-19'));
  assert.equal(stats.week, 2);
  assert.equal(stats.streak, 2);
  assert.equal(stats.dueByDay[0]?.date, '2026-09-19');
  assert.equal(stats.dueByDay[0]?.count, 2);
  store.close();
});

test('generation cannot claim a future run date or an impossible course date', () => {
  const { store, deck } = withDeck();
  const card = { deckId: deck.id, type: 'basic' as const, front: 'Q?', back: 'A', source: source('2026-09-19') };
  assert.throws(() => store.submitGeneratedCards({ runKey: 'future', date: '2026-09-20', cards: [card] }, at('2026-09-19')), /Future generation date/);
  assert.throws(() => store.createCard({ ...card, source: source('2026-99-99') }), /Invalid course date/);
  store.close();
});

test('a supplied clock gives new cards a deterministic initial due time', () => {
  const fixed = at('2026-09-19', '12:00:00');
  const store = openStudyStore(':memory:', () => fixed);
  const deck = store.createDeck({ name: 'Course', kind: 'course' });
  const card = store.createCard({ deckId: deck.id, type: 'basic', front: 'Clock?', back: 'Fixed.', source: source() });
  assert.equal(card.dueAt, fixed.toISOString());
  store.close();
});

test('Again returns when due the same day and does not use another distinct card slot', () => {
  const { store, deck } = withDeck();
  const card = store.createCard({ deckId: deck.id, type: 'basic', front: 'Again?', back: 'Yes', source: source() });
  const fresh = store.createCard({ deckId: deck.id, type: 'basic', front: 'Fresh?', back: 'Yes', source: source() });
  const first = store.gradeCard(card.id, 'again', at('2026-09-19'));
  const due = new Date(first.card.dueAt).getTime();
  assert.ok(!store.getDailyQueue(new Date(due - 1)).cards.some(item => item.id === card.id));
  assert.throws(() => store.gradeCard(card.id, 'mid', new Date(due - 1)), /not due/);
  const queue = store.getDailyQueue(new Date(due));
  assert.equal(queue.cards[0]?.id, card.id);
  assert.equal(queue.cards[1]?.id, fresh.id);
  assert.equal(queue.reviewedDistinct, 1);
  store.gradeCard(card.id, 'mid', new Date(due));
  assert.equal(store.getDailyQueue(new Date(due)).reviewedDistinct, 1);
  store.close();
});

test('same-day relearning remains available after thirty distinct reviews', () => {
  const { store, deck } = withDeck();
  let repeatId = '';
  let repeatDue = 0;
  for (let i = 0; i < 30; i++) {
    const card = store.createCard({ deckId: deck.id, type: 'basic', front: `Cap ${i}`, back: 'A', source: source() });
    const grade = store.gradeCard(card.id, 'again', at('2026-09-19'));
    if (i === 0) { repeatId = card.id; repeatDue = new Date(grade.card.dueAt).getTime(); }
  }
  const queue = store.getDailyQueue(new Date(repeatDue));
  assert.equal(queue.remaining, 0);
  assert.ok(queue.cards.some(card => card.id === repeatId));
  store.gradeCard(repeatId, 'mid', new Date(repeatDue));
  assert.equal(store.getDailyQueue(new Date(repeatDue)).reviewedDistinct, 30);
  store.close();
});

test('deleting a reviewed card preserves history and its daily slot', () => {
  const { store, deck } = withDeck();
  const card = store.createCard({ deckId: deck.id, type: 'basic', front: 'Preserve?', back: 'Yes', source: source() });
  store.gradeCard(card.id, 'mid', at('2026-09-19'));
  assert.equal(store.deleteDeck(deck.id), true);
  assert.equal(store.getReviewHistory(card.id).length, 1);
  assert.equal(store.getDailyQueue(at('2026-09-19')).reviewedDistinct, 1);
  assert.equal(store.getReviewStats(at('2026-09-19')).total, 1);
  store.close();
});

test('legacy review table migrates without dropping saved events', () => {
  const path = `/tmp/anki-review-migration-${crypto.randomUUID()}.sqlite`;
  const initial = openStudyStore(path);
  const deck = initial.createDeck({ name: 'Legacy', kind: 'course' });
  const card = initial.createCard({ deckId: deck.id, type: 'basic', front: 'Legacy?', back: 'Yes', source: source() });
  initial.close();
  const legacy = new DatabaseSync(path);
  legacy.exec(`DROP TABLE reviews;
    CREATE TABLE reviews (id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      rating TEXT NOT NULL, reviewed_at TEXT NOT NULL, local_day TEXT NOT NULL,
      previous_fsrs_json TEXT NOT NULL, previous_due_at TEXT NOT NULL,
      previous_review_count INTEGER NOT NULL);`);
  legacy.prepare(`INSERT INTO reviews (card_id,rating,reviewed_at,local_day,previous_fsrs_json,previous_due_at,previous_review_count)
    VALUES (?,?,?,?,?,?,?)`).run(card.id,'mid','2026-09-19T13:00:00Z','2026-09-19','{}','2026-09-19T12:00:00Z',0);
  legacy.close();
  const store = openStudyStore(path);
  assert.equal(store.getReviewHistory(card.id).length, 1);
  store.close();
  const db = new DatabaseSync(path);
  assert.equal(db.prepare('PRAGMA foreign_key_list(reviews)').all().length, 0);
  db.close();
});
