import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCourseTimeline, getGenerationContext } from './index.ts';
import type { CortexSnapshot } from './types.ts';

const sentence = 'A context diagram shows a software system and its relationships with people and other systems.';
const snapshot = (): CortexSnapshot => ({
  courses: [{ id: 'softeng', name: 'Ingeniería de Software', semester: '4th Semester' }],
  classes: [{ id: 'c1', courseId: 'softeng', courseName: 'Ingeniería de Software', days: [2],
    termStart: '2026-07-13', termEnd: '2026-11-06' }],
  materials: [
    { id: 'week1', courseId: 'softeng', kind: 'text', name: 'Clase Semana 1',
      tags: ['semana-1'], unit: 'Sesiones de Clase', text: `## Diapositiva 4\n\n### Texto original\n\n${sentence}`, addedAt: '2026-10-01T00:00:00Z' },
    { id: 'week12', courseId: 'softeng', kind: 'text', name: 'Clase Semana 12',
      tags: ['semana-12'], text: `## Tema futuro\n\n${sentence}`, addedAt: '2026-07-01T00:00:00Z' },
    { id: 'undated', courseId: 'softeng', kind: 'text', name: 'Miscellaneous slides',
      tags: [], text: `## Unscheduled\n\n${sentence}`, addedAt: '2026-01-01T00:00:00Z' },
    { id: 'explicit', courseId: 'softeng', kind: 'text', name: 'Lectura de octubre',
      tags: ['lectura'], description: 'Lectura para el debate del 16 de octubre.', text: `## Capítulo 1\n\n${sentence}` },
  ],
  books: [{ id: 'b32', title: 'Las 48 leyes del poder', status: 'En curso' }],
  activeSemester: '4th Semester',
});

test('course dates come from class schedule or explicit reading date, never upload time', () => {
  const timeline = buildCourseTimeline(snapshot());
  assert.equal(timeline.find((entry) => entry.sourceId === 'week1')?.date, '2026-07-15');
  assert.equal(timeline.find((entry) => entry.sourceId === 'week12')?.date, '2026-09-30');
  assert.equal(timeline.find((entry) => entry.sourceId === 'explicit')?.date, '2026-10-16');
  assert.equal(timeline.some((entry) => entry.sourceId === 'undated'), false);
});

test('future and undated course materials never become generation passages', async () => {
  const result = await getGenerationContext({ asOf: '2026-09-19', snapshot: snapshot() });
  assert.deepEqual(result.passages.map((passage) => passage.sourceId), ['week1']);
  assert.equal(result.passages[0].page, 4);
  assert.equal(result.passages[0].section, 'Diapositiva 4 · Texto original');
  assert.equal(result.passages[0].eligibleOn, '2026-07-15');
  assert.equal(result.passages[0].text, sentence);
  assert.equal(result.timeline.some((entry) => entry.sourceId === 'week12'), true);
  assert.ok(result.skipped.some((s) => s.sourceId === 'week12' && s.reason.includes('future')));
  assert.ok(result.skipped.some((s) => s.sourceId === 'undated' && s.reason.includes('No teaching date')));
});

test('book passages and highlights stop at checkpoint and require a Cortex book ID', async () => {
  const result = await getGenerationContext({ asOf: '2026-09-19', snapshot: snapshot(), bookSources: [
    { cortexBookId: 'b32', checkpoint: { page: 84 }, passages: [
      { id: 'p83', page: 83, text: 'The author explains how reputation shapes expectations before a negotiation.' },
      { id: 'p85', page: 85, text: 'This is beyond the reading checkpoint and must be hidden.' },
      { id: 'unpaged', text: 'An unpaged excerpt cannot be shown as a read passage.' },
    ], highlights: [{ id: 'h84', page: 84, text: 'A highlighted idea on the last page already read.' }] },
    { cortexBookId: 'missing', checkpoint: { page: 100 }, passages: [{ id: 'x', page: 1, text: 'A fabricated book source must never appear.' }] },
    { cortexBookId: 'b32', checkpoint: {}, passages: [{ id: 'y', page: 1, text: 'No reading checkpoint means this is not eligible.' }] },
  ] });
  assert.deepEqual(result.passages.filter((p) => p.sourceType === 'book').map((p) => p.id), ['book:b32:p83', 'book:b32:h84']);
  assert.equal(result.passages.find((p) => p.id === 'book:b32:p83')?.title, 'Las 48 leyes del poder');
  assert.ok(result.skipped.some((s) => s.reason === 'Cortex book ID not found'));
  assert.ok(result.skipped.some((s) => s.reason === 'Missing reading checkpoint'));
});

test('syllabus weeks add dated timeline topics but not card source passages', async () => {
  const data = snapshot();
  data.materials = [{ id: 'syllabus', courseId: 'softeng', kind: 'file', name: 'Programa (AI).md',
    tags: ['programa', 'ai-md'], file: { mediaId: 'md1', name: 'Programa (AI).md', mime: 'text/markdown' } }];
  const markdown = '### Semana 1 – 15 de julio\n- **Tema:** Modelos de proceso\n\n### Semana 14 – 14 de octubre\n- **Tema:** Patrones de diseño';
  const fetched: string[] = [];
  const fakeFetch = (async (url: string) => {
    fetched.push(url);
    return new Response(JSON.stringify(`data:text/plain;base64,${Buffer.from(markdown).toString('base64')}`), { status: 200 });
  }) as typeof fetch;
  const result = await getGenerationContext({ asOf: '2026-09-19', snapshot: data, fetchImpl: fakeFetch });
  assert.equal(result.passages.length, 0);
  assert.deepEqual(result.timeline.map((entry) => [entry.date, entry.title]), [
    ['2026-07-15', 'Modelos de proceso'], ['2026-10-14', 'Patrones de diseño'],
  ]);
  assert.equal(fetched.length, 1);
});

test('EPUB locations obey checkpoint and unsupported sources yield zero candidates', async () => {
  const data = snapshot();
  data.materials = [];
  const result = await getGenerationContext({ asOf: '2026-09-19', snapshot: data, bookSources: [
    { cortexBookId: 'b32', ankiBookId: 'anki-b32', checkpoint: { location: 120 }, passages: [
      { id: 'l119', location: 119, section: 'Chapter 2', text: 'An EPUB passage located before the saved position is available for study.' },
      { id: 'l121', location: 121, section: 'Chapter 2', text: 'This EPUB passage is beyond the saved reading location.' },
    ] },
  ] });
  assert.deepEqual(result.passages.map((p) => p.id), ['book:anki-b32:l119']);
  assert.equal(result.passages[0].sourceId, 'anki-b32');
  assert.equal(result.passages[0].cortexBookId, 'b32');
  assert.equal((await getGenerationContext({ asOf: '2026-09-19', snapshot: data })).passages.length, 0);
});

test('syllabus date ranges in tables use the week start', async () => {
  const data = snapshot();
  data.materials = [{ id: 'syllabus', courseId: 'softeng', kind: 'text', name: 'Syllabus', tags: ['syllabus'],
    text: '| Semana | Fechas | Tema |\n|---|---|---|\n| 9 | 07/09/26 - 13/09/26 | Arquitectura C4 |\n| 14 | 12/10/26 - 18/10/26 | Patrones |' }];
  const result = await getGenerationContext({ asOf: '2026-09-19', snapshot: data });
  assert.deepEqual(result.timeline.map((entry) => entry.date), ['2026-09-07', '2026-10-12']);
  assert.equal(result.passages.length, 0);
});
