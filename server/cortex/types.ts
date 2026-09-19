/** Read-only projection of Cortex's persisted store keys. */
export type CortexCourse = { id: string; name: string; semester: string };
export type CortexClass = {
  id: string; courseId: string; courseName: string; days: number[];
  termStart: string; termEnd: string;
};
export type CortexMaterial = {
  id: string; courseId: string; kind: 'file' | 'link' | 'text';
  name: string; unit?: string; description?: string; tags: string[];
  text?: string; file?: { mediaId: string; name: string; mime: string };
  addedAt?: string;
};
export type CortexBook = { id: string; title: string; status: string };
export type CortexSnapshot = {
  courses: CortexCourse[]; classes: CortexClass[]; materials: CortexMaterial[];
  books: CortexBook[]; activeSemester: string;
};

export type TimelineEntry = {
  id: string; courseId: string; courseName: string;
  title: string; date: string; sourceId: string;
  sourceTitle: string; section?: string;
  basis: 'explicit-date' | 'scheduled-week' | 'syllabus';
};
export type BookPassage = {
  id: string; text: string; page?: number; location?: number; section?: string;
};
export type BookSource = {
  cortexBookId: string;
  ankiBookId?: string;
  checkpoint: { page?: number; location?: number };
  passages: BookPassage[];
  highlights?: BookPassage[];
};
export type SourcePassage = {
  id: string; sourceId: string; sourceType: 'course' | 'book';
  title: string; text: string; courseId?: string; bookId?: string;
  cortexBookId?: string;
  page?: number; location?: number; section?: string; eligibleOn?: string;
};
export type GenerationContext = {
  asOf: string; timeline: TimelineEntry[]; passages: SourcePassage[];
  books: CortexBook[]; skipped: Array<{ sourceId: string; reason: string }>;
};
