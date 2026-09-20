import assert from 'node:assert/strict';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { bogotaToday, type GenerationContext } from '../cortex/index.ts';
import { openStudyStore } from '../store/index.ts';
import { createAnkiMcpServer } from './server.ts';

const day = bogotaToday();
const passage = {
  id: 'course:softeng:p4', sourceId: 'softeng', sourceType: 'course' as const,
  title: 'Context diagrams', text: 'A context diagram shows a software system and its relationships with people and other systems.',
  courseId: 'softeng', section: 'Slide 4', page: 4, eligibleOn: day,
};
const context: GenerationContext = {
  asOf: day,
  passages: [passage],
  timeline: [{ id: 't1', courseId: 'softeng', courseName: 'Software Engineering', title: 'Context diagrams',
    date: day, sourceId: 'softeng', sourceTitle: 'Slides', basis: 'explicit-date' }],
  books: [], skipped: [],
};

async function fixture(t: { after: (fn: () => void | Promise<void>) => void }) {
  const store = openStudyStore(':memory:');
  const server = createAnkiMcpServer(store, '/tmp', async (_store, _dir, asOf) => ({ ...context, asOf }));
  const client = new Client({ name: 'anki-test', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  t.after(async () => { await client.close(); await server.close(); store.close(); });
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const result = await client.callTool({ name, arguments: args });
    const first = result.content[0];
    assert.equal(first?.type, 'text');
    const raw = first.type === 'text' ? first.text : '';
    return { isError: Boolean(result.isError), value: result.isError ? raw : JSON.parse(raw) as any };
  };
  return { store, client, call };
}

test('MCP generation context excludes future dates and daily submission is grounded and idempotent', async t => {
  const { store, client, call } = await fixture(t);
  const tools = await client.listTools();
  assert.ok(tools.tools.some(tool => tool.name === 'submit_generated_cards'));
  const current = await call('get_generation_context');
  assert.equal(current.value.passages[0].id, passage.id);
  assert.equal(current.value.runKey, `daily:${day}`);
  assert.match(current.value.cardRules.join(' '), /one short answer/i);
  const future = new Date(`${day}T12:00:00Z`);
  future.setUTCDate(future.getUTCDate() + 1);
  assert.match((await call('get_generation_context', { date: future.toISOString().slice(0, 10) })).value, /Future dates/);
  assert.match((await call('get_generation_context', { date: '2026-02-30' })).value, /YYYY-MM-DD/);

  const proposed = { sourcePassageId: passage.id, type: 'basic', question: 'What does a context diagram show?',
    answer: 'software system', evidence: passage.text };
  const first = await call('submit_generated_cards', { cards: [proposed] });
  assert.equal(first.value.result.created, 1);
  assert.equal(first.value.result.rejected, 0);
  const repeat = await call('submit_generated_cards', { cards: [proposed] });
  assert.equal(repeat.value.idempotent, true);
  assert.equal(store.listCards().length, 1);
  const after = await call('get_generation_context');
  assert.deepEqual(after.value.passages, []);
  assert.equal(after.value.run.status, 'success');
});

test('MCP rejects fabricated evidence, records empty zero runs, and allows failed-run retries', async t => {
  const { store, call } = await fixture(t);
  const wrong = { sourcePassageId: passage.id, type: 'basic', question: 'What does a context diagram show?',
    answer: 'planetary orbit', evidence: passage.text };
  const rejected = await call('submit_generated_cards', { runKey: 'manual:rejected', cards: [wrong] });
  assert.equal(rejected.value.result.created, 0);
  assert.equal(rejected.value.result.rejected, 1);
  assert.equal(store.getGenerationRun('manual:rejected')?.status, 'failed');
  const corrected = await call('submit_generated_cards', { runKey: 'manual:rejected', cards: [{ ...wrong, answer: 'software system' }] });
  assert.equal(corrected.value.result.created, 1);
  assert.equal(store.getGenerationRun('manual:rejected')?.status, 'success');
  const zero = await call('submit_generated_cards', { runKey: 'manual:empty', cards: [] });
  assert.equal(zero.value.result.created, 0);
  assert.equal(store.getGenerationRun('manual:empty')?.status, 'zero');
  const failed = await call('record_generation_failure', { runKey: 'manual:retry', error: 'Cortex temporary failure' });
  assert.equal(failed.value.status, 'failed');
  const retried = await call('submit_generated_cards', { runKey: 'manual:retry', cards: [{
    ...wrong, question: 'Which thing is shown by a context diagram?', answer: 'software system',
  }] });
  assert.equal(retried.value.result.created, 1);
  assert.equal(store.getGenerationRun('manual:retry')?.status, 'success');
});

test('MCP review keeps answers concealed until reveal; manual cards, grade and undo work', async t => {
  const { store, call } = await fixture(t);
  const created = await call('create_card', { deckName: 'Personal', type: 'basic', question: 'What is the capital of Colombia?',
    answer: 'Bogotá', sourceTitle: 'My notes', sourceLocator: 'Page 2' });
  const id = created.value.id;
  const due = await call('get_due_cards');
  assert.equal(due.value.cards[0].id, id);
  assert.equal(JSON.stringify(due.value).includes('Bogotá'), false);
  assert.equal((await call('get_card_answer', { cardId: id })).value.answer, 'Bogotá');
  assert.equal((await call('search_cards', { query: 'capital' })).value.cards[0].id, id);
  const graded = await call('grade_card', { cardId: id, rating: 'ez' });
  assert.ok(graded.value.reviewId > 0);
  assert.equal(store.getCard(id)?.reviewCount, 1);
  assert.equal((await call('undo_review', { reviewId: graded.value.reviewId })).value.undone, true);
  assert.equal(store.getCard(id)?.reviewCount, 0);
});

test('MCP book checkpoints reject unread highlights', async t => {
  const { store, call } = await fixture(t);
  store.upsertBook({ id: 'book-1', title: 'Study book', totalPages: 100, filePath: '/private/book.pdf' });
  assert.equal((await call('set_reading_progress', { bookId: 'book-1', page: 12 })).value.currentPage, 12);
  assert.equal((await call('add_highlight', { bookId: 'book-1', page: 13, text: 'Unread passage' })).isError, true);
  const highlight = await call('add_highlight', { bookId: 'book-1', page: 12, text: 'A page I have read' });
  assert.equal(highlight.value.page, 12);
  const progress = await call('get_reading_progress', { bookId: 'book-1' });
  assert.equal(progress.value.highlights.length, 1);
  assert.equal(JSON.stringify(progress.value).includes('/private/book.pdf'), false);
});
