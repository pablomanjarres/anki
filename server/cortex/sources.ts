import type { BookSource, CortexMaterial, CortexSnapshot, SourcePassage, TimelineEntry } from './types.ts';
import { explicitDate, materialWeek, weekDate } from './timeline.ts';

/** Cortex's media endpoint returns a JSON data URL, regardless of stored MIME. */
export async function readCortexText(m: CortexMaterial, baseUrl: string, fetchImpl: typeof fetch): Promise<string | null> {
  if (m.kind === 'text') return m.text?.trim() || null;
  if (m.kind !== 'file' || !m.file || !/^(text\/|application\/(?:json|xml))|\.(?:md|markdown|txt)$/i.test(m.file.mime + ' ' + m.file.name)) return null;
  const response = await fetchImpl(`${baseUrl}/api/media?id=${encodeURIComponent(m.file.mediaId)}`);
  if (!response.ok) throw new Error(`Cortex media ${response.status}: ${m.id}`);
  const dataUrl = await response.json() as string | null;
  if (dataUrl === null) throw new Error(`Cortex media missing: ${m.id}`);
  const base64 = dataUrl.slice(dataUrl.indexOf('base64,') + 7);
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length > 15 * 1024 * 1024) throw new Error(`Cortex media too large: ${m.id}`);
  return new TextDecoder('utf-8', { fatal: true }).decode(buffer).trim() || null;
}

const pageOf = (heading: string): number | undefined => {
  const match = heading.match(/\b(?:diapositiva|p[aá]gina|page|slide)\s+(\d+)\b/i);
  return match ? Number(match[1]) : undefined;
};
const clean = (value: string) => value.replace(/\s+/g, ' ').trim();

/** Each returned excerpt is an exact contiguous span of its source section. */
export function coursePassages(m: CortexMaterial, title: string, date: string, text: string): SourcePassage[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const sections: Array<{ heading: string; text: string }> = [];
  let current = { heading: m.unit || 'Text', text: '' };
  let parentHeading = '';
  for (const line of lines) {
    const heading = line.match(/^(#{2,4})\s+(.+)$/);
    if (heading) {
      if (current.text.trim()) sections.push(current);
      if (heading[1].length === 2) parentHeading = clean(heading[2]);
      current = { heading: heading[1].length === 2 || !parentHeading
        ? clean(heading[2]) : `${parentHeading} · ${clean(heading[2])}`, text: '' };
    } else current.text += `${line}\n`;
  }
  if (current.text.trim()) sections.push(current);
  const hasHeadings = sections.some((s) => s.heading !== (m.unit || 'Text'));
  const usable = (hasHeadings ? sections.filter((s) => s.heading !== (m.unit || 'Text')) : sections)
    .filter((s) => clean(s.text).length >= 60);
  const out: SourcePassage[] = [];
  for (const [sectionIndex, section] of usable.entries()) {
    const paragraphs = section.text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    let chunk = '';
    let chunkNumber = 0;
    const push = () => {
      if (clean(chunk).length < 60) return;
      out.push({ id: `${m.id}:${sectionIndex}:${chunkNumber++}`, sourceId: m.id,
        sourceType: 'course', title, text: chunk.trim(), courseId: m.courseId,
        ...(pageOf(section.heading) ? { page: pageOf(section.heading) } : {}),
        section: section.heading, eligibleOn: date });
      chunk = '';
    };
    for (const paragraph of paragraphs) {
      if (chunk && chunk.length + paragraph.length > 1600) push();
      // Keep long paragraphs intact: splitting mid-claim weakens source checks.
      chunk += `${chunk ? '\n\n' : ''}${paragraph}`;
    }
    push();
  }
  return out;
}

export function syllabusTimeline(snapshot: CortexSnapshot, m: CortexMaterial, text: string): TimelineEntry[] {
  const cls = snapshot.classes.find((c) => c.courseId === m.courseId);
  if (!cls) return [];
  const courseName = snapshot.courses.find((c) => c.id === m.courseId)?.name ?? cls.courseName;
  const year = Number(cls.termStart.slice(0, 4));
  const result: TimelineEntry[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const heading = lines[i].match(/^#{2,4}\s+Semana\s+(\d{1,2})\s*[-–—:]?\s*(.*)$/i);
    const table = lines[i].match(/^\|\s*(\d{1,2})\s*\|\s*([^|]+)\|\s*([^|]+)\|/);
    if (!heading && !table) continue;
    const week = Number((heading ?? table)![1]);
    const date = explicitDate(heading?.[2] ?? table?.[2] ?? '', year) ?? weekDate(week, cls);
    if (!date || date < cls.termStart || date > cls.termEnd) continue;
    const next = heading ? lines.slice(i + 1, i + 7).find((line) => /(?:\*\*Tema:|Tema:)/i.test(line)) : undefined;
    const topic = clean((next?.replace(/^.*?Tema:\*?\s*/i, '') || table?.[3] || `Semana ${week}`).replace(/\*+/g, ''));
    result.push({ id: `syllabus:${m.id}:${week}`, courseId: m.courseId, courseName,
      title: topic, date, sourceId: m.id, sourceTitle: m.name,
      section: `Semana ${week}`, basis: 'syllabus' });
  }
  return [...new Map(result.map((entry) => [entry.id, entry])).values()];
}

export function bookPassages(snapshot: CortexSnapshot, sources: BookSource[]): { passages: SourcePassage[]; skipped: Array<{ sourceId: string; reason: string }> } {
  const books = new Map(snapshot.books.map((b) => [b.id, b]));
  const passages: SourcePassage[] = [];
  const skipped: Array<{ sourceId: string; reason: string }> = [];
  for (const source of sources) {
    const book = books.get(source.cortexBookId);
    const pageLimit = source.checkpoint?.page;
    const locationLimit = source.checkpoint?.location;
    if (!book) { skipped.push({ sourceId: source.cortexBookId, reason: 'Cortex book ID not found' }); continue; }
    if (!(Number.isInteger(pageLimit) && pageLimit! >= 1) && !(Number.isInteger(locationLimit) && locationLimit! >= 1)) {
      skipped.push({ sourceId: book.id, reason: 'Missing reading checkpoint' }); continue;
    }
    for (const passage of [...source.passages, ...(source.highlights ?? [])]) {
      const pageAllowed = passage.page !== undefined && Number.isInteger(passage.page) && pageLimit !== undefined && passage.page >= 1 && passage.page <= pageLimit;
      const locationAllowed = passage.location !== undefined && Number.isInteger(passage.location) && locationLimit !== undefined && passage.location >= 1 && passage.location <= locationLimit;
      const valid = (passage.page === undefined || pageAllowed) && (passage.location === undefined || locationAllowed) && (pageAllowed || locationAllowed);
      if (!valid || !passage.id || clean(passage.text).length < 20) continue;
      const ankiBookId = source.ankiBookId || book.id;
      passages.push({ id: `book:${ankiBookId}:${passage.id}`, sourceId: ankiBookId, sourceType: 'book',
        title: book.title, bookId: ankiBookId, cortexBookId: book.id, text: passage.text.trim(),
        ...(passage.page !== undefined ? { page: passage.page } : {}),
        ...(passage.location !== undefined ? { location: passage.location } : {}),
        ...(passage.section ? { section: passage.section } : {}) });
    }
  }
  return { passages, skipped };
}
