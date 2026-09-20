/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Card, Dashboard, Queue } from './api';
import { deriveToday } from './liveTodayModel';

const card = (id: string, deckId: string): Card => ({
  id, deckId, deckName: deckId, type: 'basic', question: id, answer: 'Answer',
  sourceTitle: 'Lecture', sourceLocator: 'Page 2',
});
const dashboard: Dashboard = {
  date: 'Saturday, September 19', reviewedToday: 30, dailyLimit: 30,
  dueCount: 4, backlogCount: 4, newCount: 0,
  courses: [{ id: 'math', name: 'Math', dueCount: 3 }, { id: 'books', name: 'Books', dueCount: 1 }],
  nextCard: null, books: [],
};
const queue: Queue = {
  cards: [], reviewedToday: 30, dailyLimit: 30, dueCount: 4,
  backlogCount: 4, newCount: 0, remaining: 0,
};

test('capped day shows zero actionable cards and courses while retaining backlog', () => {
  const today = deriveToday(dashboard, queue);
  assert.equal(today.ready, 0);
  assert.deepEqual(today.courses, []);
  assert.equal(today.nextCard, null);
  assert.equal(today.backlogCount, 4);
});

test('ready counts and course rows use the actionable queue, not backlog counts', () => {
  const due = card('due', 'math');
  const fresh = card('new', 'books');
  const today = deriveToday({ ...dashboard, reviewedToday: 12, nextCard: due }, {
    ...queue, cards: [due, fresh], reviewedToday: 12, remaining: 18,
  });
  assert.equal(today.ready, 2);
  assert.deepEqual(today.courses.map(course => [course.id, course.dueCount]), [['math', 1], ['books', 1]]);
  assert.equal(today.nextCard?.id, 'due');
  assert.equal(today.backlogCount, 4);
});
