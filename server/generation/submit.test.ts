import assert from 'node:assert/strict';
import test from 'node:test';
import type { GenerationContext } from '../cortex/index.ts';
import { openStudyStore } from '../store/index.ts';
import { submitGroundedCards } from './submit.ts';

test('generation accepts exact evidence, cites its page, and rejects unsupported claims', () => {
  const store = openStudyStore(':memory:', () => new Date('2026-09-19T13:00:00Z'));
  const context: GenerationContext = { asOf: '2026-09-19', timeline: [], books: [], skipped: [], passages: [{
    id: 'slide-4', sourceId: 'material-1', sourceType: 'course', courseId: 'softeng',
    title: 'Architecture lecture', section: 'Slide 4', page: 4, eligibleOn: '2026-09-18',
    text: 'The model 4+1 represents software architecture through different views.',
  }] };
  const good = { sourcePassageId: 'slide-4', type: 'basic' as const,
    question: 'Which model represents architecture views?', answer: '4+1',
    evidence: 'The model 4+1 represents software architecture through different views.' };
  const result = submitGroundedCards(store, context, 'daily:2026-09-19', [
    good, { ...good, answer: 'C4' }, { ...good, sourcePassageId: 'future-slide' },
  ]);
  assert.equal(result.created, 1);
  assert.equal(result.rejected, 2);
  assert.equal(store.getGenerationRun('daily:2026-09-19')?.result?.rejected, 2);
  assert.equal(store.getGenerationRun('daily:2026-09-19')?.result?.rejectionReasons?.length, 2);
  assert.equal(store.listCards()[0]?.source.page, 4);
  assert.equal(store.listCards()[0]?.source.excerpt, good.evidence);
  assert.equal(submitGroundedCards(store, context, 'daily:2026-09-19', [good]).created, 1);
  assert.equal(store.listCards().length, 1);
  store.close();
});
