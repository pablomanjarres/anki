import type { Hono } from 'hono';
import { loadCortexSnapshot, buildCourseTimeline } from '../cortex/index.ts';
import type { StudyStore } from '../store/index.ts';
import { bookView, cardView, deckView } from './format.ts';

export function registerCatalog(app: Hono, store: StudyStore) {
  app.get('/api/health', c => c.json({ ok: true, service: 'anki', time: new Date().toISOString() }));
  app.get('/api/dashboard', async c => {
    const queue = store.getDailyQueue();
    const decks = store.listDecks();
    const ready = [...queue.cards, ...queue.backlog];
    const readyByDeck = new Map<string, number>();
    ready.forEach(card => readyByDeck.set(card.deckId, (readyByDeck.get(card.deckId) ?? 0) + 1));
    let courses = decks.map(deck => ({ id: deck.id, name: deck.name, dueCount: readyByDeck.get(deck.id) ?? 0 }));
    try {
      const snapshot = await loadCortexSnapshot();
      const linked = new Set(decks.map(deck => deck.cortexId));
      const active = snapshot.courses.filter(course => !snapshot.activeSemester || course.semester === snapshot.activeSemester);
      courses = [...courses, ...active.filter(course => !linked.has(course.id)).map(course => ({ id: course.id, name: course.name, dueCount: 0 }))];
    } catch { /* Local review stays available if Cortex is offline. */ }
    return c.json({
      date: new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()),
      reviewedToday: queue.reviewedDistinct, dailyLimit: queue.cap,
      dueCount: queue.dueCount, backlogCount: queue.backlogCount, newCount: queue.newCount,
      courses, nextCard: queue.cards[0] ? cardView(queue.cards[0], store) : null,
      books: store.listBooks().map(book => bookView(book, store)),
    });
  });
  app.get('/api/queue', c => {
    const queue = store.getDailyQueue();
    return c.json({ cards: queue.cards.map(card => cardView(card, store)), reviewedToday: queue.reviewedDistinct,
      dailyLimit: queue.cap, dueCount: queue.dueCount, backlogCount: queue.backlogCount,
      newCount: queue.newCount, remaining: queue.remaining,
      backlog: queue.backlog.map(card => cardView(card, store)) });
  });
  app.get('/api/decks', c => c.json({ decks: store.listDecks().map(deck => deckView(store, deck.id)) }));
  app.get('/api/stats', c => {
    const stats = store.getReviewStats();
    return c.json({ reviewedToday: stats.today, reviewedThisWeek: stats.week, streak: stats.streak,
      dueByDay: stats.dueByDay, totalReviews: stats.total, totalCards: stats.cards });
  });
  app.get('/api/cortex/books', async c => {
    const snapshot = await loadCortexSnapshot();
    return c.json({ books: snapshot.books.map(book => ({ id: book.id, title: book.title })) });
  });
  app.get('/api/cortex/timeline', async c => {
    const snapshot = await loadCortexSnapshot();
    return c.json({ timeline: buildCourseTimeline(snapshot) });
  });
}
