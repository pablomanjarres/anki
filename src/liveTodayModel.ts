import type { Dashboard, Queue } from './api';

export function deriveToday(dashboard: Dashboard, queue: Queue) {
  const counts = new Map<string, number>();
  for (const card of queue.cards) counts.set(card.deckId, (counts.get(card.deckId) ?? 0) + 1);
  const courses = dashboard.courses.filter(course => counts.has(course.id))
    .map(course => ({ ...course, dueCount: counts.get(course.id)! }));
  const listed = new Set(courses.map(course => course.id));
  for (const card of queue.cards) {
    if (listed.has(card.deckId)) continue;
    courses.push({ id: card.deckId, name: card.deckName, dueCount: counts.get(card.deckId)! });
    listed.add(card.deckId);
  }
  return {
    ready: queue.cards.length,
    courses,
    nextCard: queue.cards[0] ?? null,
    backlogCount: queue.backlogCount,
  };
}
