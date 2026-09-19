import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { GenerationContext } from '../cortex/index.ts';
import { bogotaToday } from '../cortex/index.ts';
import { loadGenerationContext } from '../generation/context.ts';
import type { StudyStore } from '../store/index.ts';

export type ContextLoader = typeof loadGenerationContext;
export type ToolServices = {
  store: StudyStore;
  dataDir: string;
  loadContext: ContextLoader;
};

export type ToolRegistrar = (server: McpServer, services: ToolServices) => void;

export const json = (value: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(value) }],
});

export const fail = (error: unknown) => ({
  isError: true,
  content: [{ type: 'text' as const, text: error instanceof Error ? error.message : String(error) }],
});

export const safely = async <T>(work: () => Promise<T> | T) => {
  try { return json(await work()); }
  catch (error) { return fail(error); }
};

export function generationDate(value?: string): string {
  const date = value ?? bogotaToday();
  const parsed = /^20\d{2}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00Z`) : null;
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error('Date must be YYYY-MM-DD');
  }
  if (date > bogotaToday()) throw new Error('Future dates cannot be generated');
  return date;
}

export function runKey(date: string, value?: string): string {
  const key = value ?? `daily:${date}`;
  if (!key.trim() || key.length > 120) throw new Error('Run key must be 1–120 characters');
  return key;
}

export const contextFor = async (services: ToolServices, date: string, maxPassages = 24): Promise<GenerationContext> =>
  services.loadContext(services.store, services.dataDir, date, maxPassages);
