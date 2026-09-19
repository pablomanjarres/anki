import type { BookSource, CortexSnapshot, GenerationContext, SourcePassage, TimelineEntry } from './types.ts';
import { buildCourseTimeline, isStudyMaterial } from './timeline.ts';
import { bookPassages, coursePassages, readCortexText, syllabusTimeline } from './sources.ts';

export type { BookSource, BookPassage, CortexSnapshot, GenerationContext, SourcePassage, TimelineEntry } from './types.ts';
export { buildCourseTimeline, explicitDate, materialDate, weekDate } from './timeline.ts';

const KEYS = [
  'cortex-student-courses', 'cortex-classes', 'cortex-class-materials',
  'cortex-books', 'cortex-student-active-semester',
] as const;
const DEFAULT_BASE = process.env.CORTEX_API ?? 'http://127.0.0.1:3456';
const array = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

/** The date boundary used by generation, independent of the Mac's timezone. */
export function bogotaToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Cortex owns these keys; Anki only reads them through the installed app's HTTP API. */
export async function loadCortexSnapshot(baseUrl = DEFAULT_BASE, fetchImpl: typeof fetch = fetch): Promise<CortexSnapshot> {
  const url = `${baseUrl}/api/data/batch?keys=${KEYS.join(',')}`;
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`Cortex snapshot ${response.status}`);
  const data = await response.json() as { values?: Record<string, unknown> };
  if (!data || typeof data.values !== 'object' || data.values === null) throw new Error('Invalid Cortex snapshot');
  const v = data.values;
  return {
    courses: array(v['cortex-student-courses']), classes: array(v['cortex-classes']),
    materials: array(v['cortex-class-materials']), books: array(v['cortex-books']),
    activeSemester: typeof v['cortex-student-active-semester'] === 'string' ? v['cortex-student-active-semester'] : '',
  };
}

export type GenerationOptions = {
  asOf: string;
  snapshot?: CortexSnapshot;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  bookSources?: BookSource[];
  maxPassages?: number;
};

const scheduleDoc = (tags: string[]) => tags.some((tag) => /^(syllabus|cronograma|programa)$/i.test(tag));

/** Grounded passages and a dated timeline. Future timeline rows remain visible; their text cannot enter passages. */
export async function getGenerationContext(options: GenerationOptions): Promise<GenerationContext> {
  const { asOf, baseUrl = DEFAULT_BASE, fetchImpl = fetch, bookSources = [], maxPassages = 80 } = options;
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(asOf) || Number.isNaN(Date.parse(`${asOf}T12:00:00Z`))) throw new Error('asOf must be YYYY-MM-DD');
  if (!Number.isInteger(maxPassages) || maxPassages < 0 || maxPassages > 500) throw new Error('maxPassages must be 0–500');
  const snapshot = options.snapshot ?? await loadCortexSnapshot(baseUrl, fetchImpl);
  const metadataTimeline = buildCourseTimeline(snapshot);
  const materialById = new Map(snapshot.materials.map((m) => [m.id, m]));
  const skipped: GenerationContext['skipped'] = [];
  const syllabus: TimelineEntry[] = [];
  for (const m of snapshot.materials) {
    if (!scheduleDoc(m.tags ?? []) || !/\.(?:md|txt)$/i.test(m.file?.name ?? '') && m.kind !== 'text') continue;
    const content = await readCortexText(m, baseUrl, fetchImpl);
    if (content) syllabus.push(...syllabusTimeline(snapshot, m, content));
  }
  const timeline = [...metadataTimeline, ...syllabus].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const course: SourcePassage[] = [];
  for (const entry of [...metadataTimeline].sort((a, b) => b.date.localeCompare(a.date))) {
    if (entry.date > asOf) { skipped.push({ sourceId: entry.sourceId, reason: 'Scheduled for a future class' }); continue; }
    const m = materialById.get(entry.sourceId);
    if (!m) continue;
    const content = await readCortexText(m, baseUrl, fetchImpl);
    if (!content) { skipped.push({ sourceId: m.id, reason: 'No extractable source text' }); continue; }
    course.push(...coursePassages(m, entry.title, entry.date, content));
  }
  const dated = new Set(metadataTimeline.map((entry) => entry.sourceId));
  for (const m of snapshot.materials) {
    if (isStudyMaterial(m) && !dated.has(m.id) && !/\(AI\)\.md$/i.test(m.name)) {
      skipped.push({ sourceId: m.id, reason: 'No teaching date in course schedule or material' });
    }
  }
  const book = bookPassages(snapshot, bookSources);
  skipped.push(...book.skipped);
  const allPassages: SourcePassage[] = [];
  let courseIndex = 0; let bookIndex = 0;
  while (courseIndex < course.length || bookIndex < book.passages.length) {
    if (courseIndex < course.length) allPassages.push(course[courseIndex++]);
    if (bookIndex < book.passages.length) allPassages.push(book.passages[bookIndex++]);
  }
  // Rotate by study day so a bounded daily prompt reaches the whole eligible pool.
  // The starting point does not depend on maxPassages: submission can re-read a
  // larger window and still validate IDs returned by get_generation_context.
  const dayNumber = Math.floor(Date.parse(`${asOf}T00:00:00Z`) / 86_400_000);
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
  let stride = Math.min(24, Math.ceil(allPassages.length / 2));
  while (allPassages.length > 1 && gcd(stride, allPassages.length) !== 1) stride++;
  const offset = allPassages.length > maxPassages ? (dayNumber * stride) % allPassages.length : 0;
  const passages = Array.from({ length: Math.min(maxPassages, allPassages.length) },
    (_, index) => allPassages[(offset + index) % allPassages.length]!);
  return { asOf, timeline, passages, books: snapshot.books, skipped };
}
