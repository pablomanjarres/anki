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
  const c4Evidence = 'El modelo C4 permite crear “mapas” del código con varios niveles de detalle.';
  const context: GenerationContext = { asOf: '2026-09-19', timeline: [], books: [], skipped: [], passages: [{
    id: 'slide-5', sourceId: 'material-1', sourceType: 'course', courseId: 'softeng',
    title: 'Architecture lecture', section: 'Slide 5', page: 5, eligibleOn: '2026-09-18', text: `${evidence} ${c4Evidence}`,
  }] };
  const base = { sourcePassageId: 'slide-5', type: 'basic' as const, evidence };
  const result = submitGroundedCards(store, context, 'daily:2026-09-19', [
    { ...base, question: '¿Qué problemas comunes presentan los diagramas arquitectónicos ad hoc?', answer: 'notaciones incomprensibles y una semántica poco clara' },
    { ...base, question: 'Enumera los problemas de los diagramas arquitectónicos ad hoc.', answer: 'notaciones incomprensibles' },
    { ...base, question: '¿Qué permite crear la analogía C4?', answer: '“mapas” del código con varios niveles de detalle', evidence: c4Evidence },
    { ...base, question: 'En los diagramas arquitectónicos ad hoc, ¿cómo se describen las notaciones?', answer: 'incomprensibles' },
  ]);
  assert.equal(result.created, 1);
  assert.equal(result.rejected, 3);
  assert.match(result.rejectionReasons?.[0]?.reason ?? '', /one|single|short|list/i);
  assert.match(result.rejectionReasons?.[1]?.reason ?? '', /one|single|short|list/i);
  assert.match(result.rejectionReasons?.[2]?.reason ?? '', /one|single|short|list/i);
  assert.equal(store.listCards()[0]?.back, 'incomprensibles');
  store.close();
});

test('generation keeps concise facts with conjunctions, decimals, and precise outcome questions', () => {
  const store = openStudyStore(':memory:', () => new Date('2026-09-19T13:00:00Z'));
  const passages = [
    { id: 'number', text: 'La cifra aproximada es 3,14.' },
    { id: 'center', text: 'El centro se llama Investigación y Desarrollo.' },
    { id: 'worktree', text: 'Git worktree permite crear ramas aisladas sin clonar.' },
  ].map(item => ({ ...item, sourceId: 'material-1', sourceType: 'course' as const,
    courseId: 'softeng', title: 'Software tools', section: 'Slide 1', page: 1, eligibleOn: '2026-09-18' }));
  const context: GenerationContext = { asOf: '2026-09-19', timeline: [], books: [], skipped: [], passages };
  const proposals = [
    { sourcePassageId: 'number', question: '¿Cuál es la cifra aproximada?', answer: '3,14', evidence: passages[0]!.text },
    { sourcePassageId: 'center', question: '¿Cómo se llama el centro?', answer: 'Investigación y Desarrollo', evidence: passages[1]!.text },
    { sourcePassageId: 'worktree', question: '¿Qué permite crear ramas aisladas sin clonar?', answer: 'Git worktree', evidence: passages[2]!.text },
  ].map(item => ({ ...item, type: 'basic' as const }));
  const result = submitGroundedCards(store, context, 'daily:2026-09-19', proposals);
  assert.equal(result.created, 3);
  assert.equal(result.rejected, 0);
  store.close();
});

test('generation rejects English list questions even when their answers fit the word limit', () => {
  const store = openStudyStore(':memory:', () => new Date('2026-09-19T13:00:00Z'));
  const evidence = 'Ad hoc architecture diagrams have confusing notation and unclear semantics.';
  const context: GenerationContext = { asOf: '2026-09-19', timeline: [], books: [], skipped: [], passages: [{
    id: 'slide-6', sourceId: 'material-1', sourceType: 'course', courseId: 'softeng',
    title: 'Architecture lecture', section: 'Slide 6', page: 6, eligibleOn: '2026-09-18', text: evidence,
  }] };
  const base = { sourcePassageId: 'slide-6', type: 'basic' as const, evidence, answer: 'confusing notation and unclear semantics' };
  const result = submitGroundedCards(store, context, 'daily:list-prompts', [
    { ...base, question: 'What common problems do ad hoc architecture diagrams have?' },
    { ...base, question: 'Which problems do ad hoc architecture diagrams have?' },
    { ...base, question: 'Name the problems with ad hoc architecture diagrams.' },
    { ...base, question: 'What are the problems with ad hoc architecture diagrams?' },
    { ...base, question: 'What are some common problems with ad hoc architecture diagrams?' },
    { ...base, question: '¿Cuáles son los problemas de los diagramas arquitectónicos ad hoc?' },
    { ...base, question: 'Which issue affects ad hoc architecture diagrams?', answer: 'unclear semantics' },
  ]);
  assert.equal(result.created, 1);
  assert.equal(result.rejected, 6);
  assert.ok(result.rejectionReasons?.every(item => /one|specific|list/i.test(item.reason)));
  assert.equal(store.listCards()[0]?.back, 'unclear semantics');
  store.close();
});

test('an all-rejected proposal batch stays retryable while an empty batch records zero', () => {
  const store = openStudyStore(':memory:', () => new Date('2026-09-19T13:00:00Z'));
  const evidence = 'El modelo C4 permite crear mapas del código.';
  const context: GenerationContext = { asOf: '2026-09-19', timeline: [], books: [], skipped: [], passages: [{
    id: 'slide-1', sourceId: 'material-1', sourceType: 'course', courseId: 'softeng',
    title: 'Architecture lecture', section: 'Slide 1', page: 1, eligibleOn: '2026-09-18', text: evidence,
  }] };
  const valid = { sourcePassageId: 'slide-1', type: 'basic' as const,
    question: '¿Qué permite crear el modelo C4?', answer: 'mapas del código', evidence };
  const rejected = submitGroundedCards(store, context, 'daily:2026-09-19', [{ ...valid, answer: 'todos los diagramas' }]);
  assert.equal(rejected.created, 0);
  assert.equal(rejected.rejected, 1);
  assert.equal(store.getGenerationRun('daily:2026-09-19')?.status, 'failed');
  assert.equal(submitGroundedCards(store, context, 'daily:2026-09-19', [valid]).created, 1);
  assert.equal(store.getGenerationRun('daily:2026-09-19')?.status, 'success');
  assert.equal(submitGroundedCards(store, context, 'daily:empty', []).created, 0);
  assert.equal(store.getGenerationRun('daily:empty')?.status, 'zero');
  store.close();
});
