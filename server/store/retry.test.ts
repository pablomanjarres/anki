import assert from 'node:assert/strict';
import test from 'node:test';
import { openStudyStore } from './index.ts';

test('a failed daily generation run can retry with the same key', () => {
  const store = openStudyStore(':memory:', () => new Date('2026-09-19T13:00:00Z'));
  const deck = store.createDeck({ name: 'Course', kind: 'course', cortexId: 'course-1' });
  store.recordGenerationRun({ runKey: 'daily:2026-09-19', date: '2026-09-19', status: 'failed', error: 'Cortex unavailable' });
  const submission = { runKey: 'daily:2026-09-19', date: '2026-09-19', cards: [{
    deckId: deck.id, type: 'basic' as const, front: 'What is the theorem?', back: 'A grounded answer',
    source: { type: 'course' as const, id: 'course-1', title: 'Course', excerpt: 'A grounded answer', section: 'Week 1', eligibleOn: '2026-09-18' },
  }] };
  assert.equal(store.submitGeneratedCards(submission).created, 1);
  assert.equal(store.submitGeneratedCards(submission).created, 1);
  assert.equal(store.listCards().length, 1);
  assert.equal(store.getGenerationRun(submission.runKey)?.status, 'success');
  store.close();
});
