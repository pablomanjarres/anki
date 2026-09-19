import type { Hono } from 'hono';
import type { CardInput, StudyStore } from '../store/index.ts';
import { cardView, deckView } from './format.ts';
import { object, optional, required } from './input.ts';

function manualCard(body: Record<string, unknown>): CardInput {
  const deckId = required(body.deckId, 'Deck');
  const type = body.type === 'cloze' ? 'cloze' : 'basic';
  const front = required(body.question, 'Question');
  const title = required(body.sourceTitle, 'Source title');
  return {
    deckId, type, front, back: required(body.answer, 'Answer'),
    clozeText: type === 'cloze' ? front : undefined,
    source: { type: 'manual', id: `manual:${deckId}:${title}`, title,
      section: required(body.sourceLocator, 'Page or section'), excerpt: optional(body.sourceExcerpt) },
  };
}

export function registerCards(app: Hono, store: StudyStore) {
  app.post('/api/decks', async c => {
    const body = object(await c.req.json());
    const deck = store.createDeck({ name: required(body.name, 'Deck name'), kind: 'custom' });
    return c.json(deckView(store, deck.id), 201);
  });
  app.patch('/api/decks/:id', async c => {
    const body = object(await c.req.json());
    store.updateDeck(c.req.param('id'), { name: required(body.name, 'Deck name') });
    return c.json(deckView(store, c.req.param('id')));
  });
  app.delete('/api/decks/:id', c => {
    if (!store.deleteDeck(c.req.param('id'))) return c.json({ error: 'Deck not found' }, 404);
    return c.body(null, 204);
  });
  app.get('/api/cards', c => {
    const query = c.req.query('query') ?? '';
    const deckId = c.req.query('deckId') ?? '';
    const cards = query ? store.searchCards(query) : store.listCards();
    return c.json({ cards: cards.filter(card => !deckId || card.deckId === deckId).map(card => cardView(card, store)) });
  });
  app.post('/api/cards', async c => {
    const card = store.createCard(manualCard(object(await c.req.json())));
    return c.json(cardView(card, store), 201);
  });
  app.patch('/api/cards/:id', async c => {
    const id = c.req.param('id');
    const old = store.getCard(id);
    if (!old) return c.json({ error: 'Card not found' }, 404);
    const body = object(await c.req.json());
    const source = { ...old.source };
    if (body.sourceTitle !== undefined) source.title = required(body.sourceTitle, 'Source title');
    if (body.sourceLocator !== undefined) source.section = required(body.sourceLocator, 'Page or section');
    if (body.sourceExcerpt !== undefined) source.excerpt = optional(body.sourceExcerpt);
    const type = body.type === undefined ? old.type : body.type === 'cloze' ? 'cloze' : 'basic';
    const front = body.question === undefined ? old.front : required(body.question, 'Question');
    const card = store.updateCard(id, { deckId: body.deckId === undefined ? old.deckId : required(body.deckId, 'Deck'),
      type, front, back: body.answer === undefined ? old.back : required(body.answer, 'Answer'),
      clozeText: type === 'cloze' ? front : undefined, source });
    return c.json(cardView(card, store));
  });
  app.delete('/api/cards/:id', c => {
    if (!store.deleteCard(c.req.param('id'))) return c.json({ error: 'Card not found' }, 404);
    return c.body(null, 204);
  });
}
