import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { safely, type ToolServices } from './common.ts';

const rating = z.enum(['again', 'hard', 'mid', 'easy', 'ez']);

export function registerStudyTools(server: McpServer, { store }: ToolServices): void {
  server.registerTool('get_due_counts', {
    title: 'Study queue counts',
    description: 'Read today’s 30 distinct-card limit, due and new counts, and overdue backlog. Due cards come first.',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, () => safely(() => {
    const queue = store.getDailyQueue();
    return { due: queue.dueCount, new: queue.newCount, backlog: queue.backlogCount,
      reviewedDistinct: queue.reviewedDistinct, remaining: queue.remaining, dailyLimit: queue.cap };
  }));

  server.registerTool('get_due_cards', {
    title: 'Get questions ready to review',
    description: 'Return ready questions and citations without their answers. Call get_card_answer only after the learner tries to answer.',
    inputSchema: { limit: z.number().int().min(1).max(30).optional() },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, ({ limit }) => safely(() => ({
    cards: store.getDailyQueue().cards.slice(0, limit ?? 5).map(card => ({
      id: card.id, deckId: card.deckId, type: card.type, question: card.front,
      sourceTitle: card.source.title,
      sourceLocator: card.source.section ?? (card.source.page ? `Page ${card.source.page}` : `Location ${card.source.location}`),
      isNew: card.reviewCount === 0,
    })),
  })));

  server.registerTool('get_card_answer', {
    title: 'Reveal a card answer',
    description: 'Reveal the answer to a card in today’s queue after the learner has attempted it.',
    inputSchema: { cardId: z.string().min(1) },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, ({ cardId }) => safely(() => {
    if (!store.getDailyQueue().cards.some(card => card.id === cardId)) throw new Error('Card is not in today’s queue');
    const card = store.getCard(cardId)!;
    return { cardId, answer: card.back, source: card.source };
  }));

  server.registerTool('search_cards', {
    title: 'Search study cards',
    description: 'Search card questions and answers by text.',
    inputSchema: { query: z.string().min(1), limit: z.number().int().min(1).max(30).optional() },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, ({ query, limit }) => safely(() => ({ cards: store.searchCards(query).slice(0, limit ?? 10) })));

  server.registerTool('create_card', {
    title: 'Create a manual study card',
    description: 'Create a basic or cloze card in a custom deck, with a user supplied source title and page or section locator. Generated course and book cards must use submit_generated_cards.',
    inputSchema: {
      deckName: z.string().min(1).max(120), type: z.enum(['basic', 'cloze']),
      question: z.string().min(1), answer: z.string().min(1), clozeText: z.string().optional(),
      sourceTitle: z.string().min(1), sourceLocator: z.string().min(1),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, ({ deckName, type, question, answer, clozeText, sourceTitle, sourceLocator }) => safely(() => {
    let deck = store.listDecks().find(item => item.kind === 'custom' && item.name.toLowerCase() === deckName.trim().toLowerCase());
    deck ??= store.createDeck({ name: deckName.trim(), kind: 'custom' });
    const source = { type: 'manual' as const, id: `manual:${deck.id}:${sourceTitle.trim()}:${sourceLocator.trim()}`,
      title: sourceTitle.trim(), section: sourceLocator.trim() };
    return store.createCard({ deckId: deck.id, type, front: question, back: answer, clozeText, source });
  }));

  server.registerTool('grade_card', {
    title: 'Grade a reviewed card',
    description: 'Grade a card in today’s queue using Again, Hard, Mid, Easy, or EZ. EZ extends the Easy interval.',
    inputSchema: { cardId: z.string().min(1), rating },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, ({ cardId, rating: value }) => safely(() => {
    if (!store.getDailyQueue().cards.some(card => card.id === cardId)) throw new Error('Card is not in today’s queue');
    const grade = store.gradeCard(cardId, value);
    return { reviewId: grade.reviewId, rating: grade.rating, nextDue: grade.card.dueAt,
      remaining: store.getDailyQueue().remaining };
  }));

  server.registerTool('undo_review', {
    title: 'Undo the latest review',
    description: 'Undo the last grade from today. An optional reviewId prevents undoing another, newer review.',
    inputSchema: { reviewId: z.number().int().positive().optional() },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, ({ reviewId }) => safely(() => {
    const card = store.undoLastGrade(new Date(), reviewId);
    return { undone: Boolean(card), card };
  }));
}
