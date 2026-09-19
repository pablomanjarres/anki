export type CardKind = 'basic' | 'cloze';
export type Source = {
  type: 'course' | 'book' | 'manual';
  id: string;
  title: string;
  excerpt?: string;
  section?: string;
  page?: number;
  location?: number;
  eligibleOn?: string;
};
export type DeckInput = { name: string; kind: 'course' | 'book' | 'custom'; cortexId?: string };
export type Deck = DeckInput & { id: string; createdAt: string };
export type CardInput = {
  deckId: string;
  type: CardKind;
  front: string;
  back: string;
  clozeText?: string;
  source: Source;
  tags?: string[];
};
export type StudyCard = CardInput & {
  id: string;
  dueAt: string;
  reviewCount: number;
  createdAt: string;
};
export type Rating = 'again' | 'hard' | 'mid' | 'easy' | 'ez';
export type Queue = {
  cards: StudyCard[];
  dueCount: number;
  backlogCount: number;
  backlog: StudyCard[];
  newCount: number;
  reviewedDistinct: number;
  remaining: number;
  cap: number;
};
export type GradeResult = { card: StudyCard; rating: Rating; reviewedAt: string; reviewId: number };
export type ReviewEvent = { id: number; cardId: string; rating: Rating; reviewedAt: string; localDay: string };
export type BookInput = { id: string; title: string; author?: string; cortexBookId?: string; currentPage?: number; currentLocation?: number; totalPages?: number; filePath?: string; fileName?: string; fileType?: 'pdf' | 'epub' };
export type Book = BookInput & { currentPage: number; updatedAt: string };
export type HighlightInput = { bookId: string; page?: number; location?: number; text: string; note?: string };
export type Highlight = HighlightInput & { id: string; createdAt: string };
export type Submission = { runKey: string; date: string; cards: CardInput[] };
export type SubmissionResult = { created: number; duplicates: number; rejected: number; paused: boolean; cardIds: string[] };
export type GenerationRunInput = { runKey: string; date: string; status: 'success' | 'failed' | 'zero'; result?: SubmissionResult; error?: string };
export type GenerationRun = GenerationRunInput & { createdAt: string };
