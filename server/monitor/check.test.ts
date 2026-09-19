import assert from 'node:assert/strict';
import test from 'node:test';
import { openStudyStore } from '../store/index.ts';
import { alertForRun } from './check.ts';

test('daily monitor alerts only after 8:00 Bogota and clears on zero-card run', () => {
  const store = openStudyStore();
  assert.equal(alertForRun(store, new Date('2026-09-19T12:59:00Z')), null);
  assert.match(alertForRun(store, new Date('2026-09-19T13:01:00Z')) ?? '', /no 2026-09-19 generation result/);
  store.recordGenerationRun({ runKey: 'daily:2026-09-19', date: '2026-09-19', status: 'zero' });
  assert.equal(alertForRun(store, new Date('2026-09-19T13:01:00Z')), null);
  store.close();
});

test('daily monitor reports a failed run', () => {
  const store = openStudyStore();
  store.recordGenerationRun({ runKey: 'daily:2026-09-19', date: '2026-09-19', status: 'failed', error: 'Cortex unavailable' });
  assert.match(alertForRun(store, new Date('2026-09-19T13:01:00Z')) ?? '', /Cortex unavailable/);
  store.close();
});
