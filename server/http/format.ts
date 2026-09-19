import type { Book, StudyCard, StudyStore } from '../store/index.ts';

export function cardView(card: StudyCard, store: StudyStore) {
  const source = card.source;
  const locator = source.section ?? (source.page ? `Page ${source.page}` : source.location ? `Location ${source.location}` : 'Source');
  return {
    id: card.id, deckId: card.deckId,
    deckName: store.listDecks().find(deck => deck.id === card.deckId)?.name ?? 'Deck',
    type: card.type, question: card.front, answer: card.back,
    sourceTitle: source.title, sourceLocator: locator, sourceExcerpt: source.excerpt,
    dueAt: card.dueAt, isNew: card.reviewCount === 0,
  };
}

export function bookView(book: Book, store: StudyStore) {
  return {
    id: book.id, cortexBookId: book.cortexBookId, title: book.title,
    author: book.author, currentPage: book.currentPage || undefined,
    location: book.currentLocation ? String(book.currentLocation) : undefined,
    highlightCount: store.listHighlights(book.id).length,
    cardCount: store.listCards().filter(card => card.source.type === 'book' && card.source.id === book.id).length,
    fileName: book.fileName,
  };
}

export function deckView(store: StudyStore, id: string) {
  const deck = store.listDecks().find(item => item.id === id);
  if (!deck) throw new Error('Unknown deck');
  const cards = store.listCards(id);
  const due = new Set(store.getDailyQueue().cards.map(card => card.id));
  return { id: deck.id, name: deck.name, cardCount: cards.length, dueCount: cards.filter(card => due.has(card.id)).length };
}
