export type Rating = 'again' | 'hard' | 'mid' | 'easy' | 'ez';
export type CardType = 'basic' | 'cloze';

export interface Card {
  id: string;
  deckId: string;
  deckName: string;
  type: CardType;
  question: string;
  answer: string;
  clozeText?: string;
  sourceTitle: string;
  sourceLocator: string;
  sourceExcerpt?: string;
  dueAt?: string;
  isNew?: boolean;
}

export interface Book {
  id: string;
  cortexBookId?: string;
  title: string;
  author?: string;
  currentPage?: number;
  location?: string;
  highlightCount?: number;
  cardCount?: number;
  fileName?: string;
}

export interface Dashboard {
  date: string;
  reviewedToday: number;
  dailyLimit: number;
  dueCount: number;
  backlogCount: number;
  newCount: number;
  courses: { id: string; name: string; dueCount: number }[];
  nextCard: Card | null;
  books: Book[];
}

export interface Queue {
  cards: Card[];
  reviewedToday: number;
  dailyLimit: number;
  dueCount: number;
  backlogCount: number;
  newCount: number;
  remaining: number;
}

export interface Deck { id: string; name: string; cardCount: number; dueCount: number }
export interface Stats {
  reviewedToday: number;
  reviewedThisWeek: number;
  streak: number;
  retention?: number;
  dueByDay: { date: string; count: number }[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(`/api${path}`, init); }
  catch { throw new Error('Cannot reach Anki. Check that the local server is running.'); }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status}).`);
  if (response.status !== 204 && body === null) throw new Error('The server returned an invalid response.');
  return body as T;
}

function json(method: string, value?: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: value === undefined ? undefined : JSON.stringify(value) };
}

export const api = {
  dashboard: () => request<Dashboard>('/dashboard'),
  queue: () => request<Queue>('/queue'),
  decks: () => request<{ decks: Deck[] }>('/decks'),
  createDeck: (name: string) => request<Deck>('/decks', json('POST', { name })),
  updateDeck: (id: string, name: string) => request<Deck>(`/decks/${encodeURIComponent(id)}`, json('PATCH', { name })),
  deleteDeck: (id: string) => request<void>(`/decks/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  cards: (query = '', deckId = '') => request<{ cards: Card[] }>(`/cards?${new URLSearchParams({ query, deckId })}`),
  books: () => request<{ books: Book[] }>('/books'),
  cortexBooks: () => request<{ books: { id: string; title: string }[] }>('/cortex/books'),
  stats: () => request<Stats>('/stats'),
  grade: (cardId: string, rating: Rating) => request<{ reviewId: string; nextDue: string }>('/reviews', json('POST', { cardId, rating })),
  undo: (reviewId: string) => request<void>('/reviews/undo', json('POST', { reviewId })),
  createCard: (card: Omit<Card, 'id' | 'deckName' | 'dueAt' | 'isNew'>) => request<Card>('/cards', json('POST', card)),
  updateCard: (id: string, changes: Partial<Card>) => request<Card>(`/cards/${encodeURIComponent(id)}`, json('PATCH', changes)),
  deleteCard: (id: string) => request<void>(`/cards/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  createBook: (book: Pick<Book, 'title' | 'author' | 'cortexBookId'>) => request<Book>('/books', json('POST', book)),
  updateBook: (id: string, changes: Pick<Book, 'currentPage' | 'location'>) => request<Book>(`/books/${encodeURIComponent(id)}`, json('PATCH', changes)),
  deleteBook: (id: string) => request<void>(`/books/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  uploadBook: (id: string, file: File) => { const body = new FormData(); body.set('file', file); return request<Book>(`/books/${encodeURIComponent(id)}/file`, { method: 'POST', body }); },
  addHighlight: (id: string, highlight: { text: string; locator?: string; note?: string }) => request<void>(`/books/${encodeURIComponent(id)}/highlights`, json('POST', highlight)),
};
