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

test('generation rejects broad multi-part answers and prompts that ask for a list', () => {
  const store = openStudyStore(':memory:', () => new Date('2026-09-19T13:00:00Z'));
  const evidence = 'Los diagramas arquitectónicos ad hoc presentan notaciones incomprensibles y una semántica poco clara.';
  const context: GenerationContext = { asOf: '2026-09-19', timeline: [], books: [], skipped: [], passages: [{
    id: 'slide-5', sourceId: 'material-1', sourceType: 'course', courseId: 'softeng',
    title: 'Architecture lecture', section: 'Slide 5', page: 5, eligibleOn: '2026-09-18', text: evidence,
  }] };
  const base = { sourcePassageId: 'slide-5', type: 'basic' as const, evidence };
  const result = submitGroundedCards(store, context, 'daily:2026-09-19', [
    { ...base, question: '¿Qué problemas comunes presentan los diagramas arquitectónicos ad hoc?', answer: 'notaciones incomprensibles y una semántica poco clara' },
    { ...base, question: 'Enumera los problemas de los diagramas arquitectónicos ad hoc.', answer: 'notaciones incomprensibles' },
    { ...base, question: 'En los diagramas arquitectónicos ad hoc, ¿cómo se describen las notaciones?', answer: 'incomprensibles' },
  ]);
  assert.equal(result.created, 1);
  assert.equal(result.rejected, 2);
  assert.match(result.rejectionReasons?.[0]?.reason ?? '', /one|single|short|list/i);
  assert.match(result.rejectionReasons?.[1]?.reason ?? '', /one|single|short|list/i);
  assert.equal(store.listCards()[0]?.back, 'incomprensibles');
  store.close();
});
