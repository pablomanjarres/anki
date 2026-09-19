import type { CortexClass, CortexMaterial, CortexSnapshot, TimelineEntry } from './types.ts';

const MONTHS: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12,
};
const adminTags = new Set(['pacto', 'programa', 'syllabus', 'cronograma', 'calendario-académico']);
const dateString = (year: number, month: number, day: number): string | undefined => {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day
    ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : undefined;
};
const norm = (value: string) => value.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

/** Only an explicit teaching/reading date or scheduled week establishes eligibility. */
export function explicitDate(value: string, year: number): string | undefined {
  const iso = value.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) return dateString(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const spanish = norm(value).match(/\b(\d{1,2})\s+(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+(?:de\s+)?(20\d{2}))?\b/);
  if (spanish) return dateString(Number(spanish[3] ?? year), MONTHS[spanish[2]], Number(spanish[1]));
  const slash = value.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (slash) {
    const rawYear = slash[3];
    return dateString(rawYear ? Number(rawYear.length === 2 ? `20${rawYear}` : rawYear) : year, Number(slash[2]), Number(slash[1]));
  }
  return undefined;
}

export function weekDate(week: number, cls: CortexClass): string | undefined {
  if (!Number.isInteger(week) || week < 1 || week > 25 || !/^20\d{2}-\d{2}-\d{2}$/.test(cls.termStart)) return undefined;
  const start = new Date(`${cls.termStart}T12:00:00Z`);
  if (Number.isNaN(start.getTime())) return undefined;
  const mondayOffset = (start.getUTCDay() + 6) % 7;
  const firstDay = [...cls.days].filter((day) => Number.isInteger(day) && day >= 0 && day <= 6).sort((a, b) => a - b)[0] ?? 0;
  start.setUTCDate(start.getUTCDate() - mondayOffset + (week - 1) * 7 + firstDay);
  const result = start.toISOString().slice(0, 10);
  return result >= cls.termStart && result <= cls.termEnd ? result : undefined;
}

export function isStudyMaterial(m: CortexMaterial): boolean {
  const tags = (m.tags ?? []).map(norm);
  return !tags.some((tag) => adminTags.has(tag)) && !/^(pacto|programa|syllabus|cronograma|generalidades)/i.test(norm(m.name));
}

export function materialWeek(m: CortexMaterial): number | undefined {
  for (const tag of [...(m.tags ?? []), m.name]) {
    const match = norm(tag).match(/\b(?:semana|sesion|clase)[-\s]+(\d{1,2})\b/);
    if (match) return Number(match[1]);
  }
  return undefined;
}

export function materialDate(m: CortexMaterial, cls: CortexClass): { date: string; basis: TimelineEntry['basis'] } | undefined {
  const year = Number(cls.termStart.slice(0, 4));
  const explicit = explicitDate(`${m.description ?? ''} ${m.name}`, year);
  if (explicit && explicit >= cls.termStart && explicit <= cls.termEnd) return { date: explicit, basis: 'explicit-date' };
  const week = materialWeek(m);
  const date = week === undefined ? undefined : weekDate(week, cls);
  return date ? { date, basis: 'scheduled-week' } : undefined;
}

export function buildCourseTimeline(snapshot: CortexSnapshot): TimelineEntry[] {
  const classes = new Map(snapshot.classes.map((item) => [item.courseId, item]));
  const courses = new Map(snapshot.courses.map((item) => [item.id, item]));
  const aiTwins = new Set(snapshot.materials.filter((m) => /\(AI\)\.md$/i.test(m.name)).map((m) => `${m.courseId}:${m.name.replace(/\s*\(AI\)\.md$/i, '')}`));
  return snapshot.materials.flatMap((m) => {
    const cls = classes.get(m.courseId);
    if (!cls || !isStudyMaterial(m) || (!/\(AI\)\.md$/i.test(m.name) && aiTwins.has(`${m.courseId}:${m.name}`))) return [];
    const scheduled = materialDate(m, cls);
    if (!scheduled) return [];
    return [{ id: `material:${m.id}`, courseId: m.courseId,
      courseName: courses.get(m.courseId)?.name ?? cls.courseName,
      title: m.name.replace(/\s*\(AI\)\.md$/i, ''), date: scheduled.date,
      sourceId: m.id, sourceTitle: m.name,
      section: m.unit || undefined, basis: scheduled.basis } satisfies TimelineEntry];
  }).sort((a, b) => a.date.localeCompare(b.date) || a.courseName.localeCompare(b.courseName) || a.title.localeCompare(b.title));
}
