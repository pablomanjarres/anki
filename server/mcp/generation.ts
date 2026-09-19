import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { submitGroundedCards } from '../generation/submit.ts';
import { contextFor, generationDate, runKey, safely, type ToolServices } from './common.ts';

const proposal = z.object({
  sourcePassageId: z.string().min(1),
  type: z.enum(['basic', 'cloze']),
  question: z.string().min(12),
  answer: z.string().min(2),
  evidence: z.string().min(15).describe('Exact quotation from the cited passage that contains the answer'),
  clozeText: z.string().optional(),
});

export function registerGenerationTools(server: McpServer, services: ToolServices): void {
  server.registerTool('get_generation_context', {
    title: 'Get grounded study passages',
    description: 'Read eligible Cortex course passages and uploaded book passages through the saved reading checkpoint. Never infer teaching dates from upload time. Use passage IDs and exact evidence in submit_generated_cards. A completed daily run needs no more cards.',
    inputSchema: {
      date: z.string().optional().describe('America/Bogota study day, YYYY-MM-DD; defaults to today'),
      maxPassages: z.number().int().min(1).max(80).optional(),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, ({ date, maxPassages }) => safely(async () => {
    const day = generationDate(date);
    const key = runKey(day);
    const prior = services.store.getGenerationRun(key);
    if (prior?.status === 'success' || prior?.status === 'zero') {
      return { date: day, runKey: key, run: prior, passages: [], message: 'Daily run already recorded' };
    }
    const context = await contextFor(services, day, maxPassages ?? 24);
    return {
      date: day, runKey: key, run: prior,
      passages: context.passages,
      eligibleTimeline: context.timeline.filter(entry => entry.date <= day),
      skipped: context.skipped,
      unreviewedPool: services.store.listCards().filter(card => card.reviewCount === 0).length,
      targetNewCards: 5,
    };
  }));

  server.registerTool('submit_generated_cards', {
    title: 'Submit cited study cards',
    description: 'Record a daily run, including an empty zero-card run. Each card must name an eligible passage ID, quote exact evidence, and have an answer present in that quote. The store rejects duplicate and excess cards. Repeating the same runKey is idempotent.',
    inputSchema: {
      date: z.string().optional().describe('America/Bogota study day, YYYY-MM-DD; defaults to today'),
      runKey: z.string().optional().describe('Stable retry key; defaults to daily:YYYY-MM-DD'),
      cards: z.array(proposal).max(5),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, ({ date, runKey: requestedKey, cards }) => safely(async () => {
    const day = generationDate(date);
    const key = runKey(day, requestedKey);
    const prior = services.store.getGenerationRun(key);
    if (prior?.status === 'success' || prior?.status === 'zero') {
      return { date: day, runKey: key, result: prior.result, idempotent: true };
    }
    const context = await contextFor(services, day, 80);
    const result = submitGroundedCards(services.store, context, key, cards);
    return { date: day, runKey: key, result, idempotent: false };
  }));

  server.registerTool('get_generation_run', {
    title: 'Check daily generation run',
    description: 'Read the saved success, zero-card, or failure result for a study day.',
    inputSchema: {
      date: z.string().optional(),
      runKey: z.string().optional(),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, ({ date, runKey: requestedKey }) => safely(() => {
    const day = generationDate(date);
    return { date: day, run: services.store.getGenerationRun(runKey(day, requestedKey)) };
  }));

  server.registerTool('record_generation_failure', {
    title: 'Record a failed daily generation',
    description: 'Use only when the daily generation attempt failed. The same run key may be retried later. Do not call after a successful or zero-card run.',
    inputSchema: {
      date: z.string().optional(),
      runKey: z.string().optional(),
      error: z.string().min(3).max(500),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, ({ date, runKey: requestedKey, error }) => safely(() => {
    const day = generationDate(date);
    const key = runKey(day, requestedKey);
    const prior = services.store.getGenerationRun(key);
    if (prior?.status === 'success' || prior?.status === 'zero') throw new Error('Completed runs cannot be marked failed');
    return services.store.recordGenerationRun({ runKey: key, date: day, status: 'failed', error });
  }));
}
