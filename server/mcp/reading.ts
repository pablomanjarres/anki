import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { safely, type ToolServices } from './common.ts';

export function registerReadingTools(server: McpServer, { store }: ToolServices): void {
  server.registerTool('get_reading_progress', {
    title: 'Get reading progress',
    description: 'List tracked books and their PDF pages or EPUB locations. Optionally include saved highlights for one book.',
    inputSchema: { bookId: z.string().optional() },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, ({ bookId }) => safely(() => {
    if (!bookId) return { books: store.listBooks() };
    const book = store.getBook(bookId);
    if (!book) throw new Error('Unknown book');
    return { book, highlights: store.listHighlights(bookId) };
  }));

  server.registerTool('set_reading_progress', {
    title: 'Update reading checkpoint',
    description: 'Set the last read PDF page or EPUB location. Only source text at or before this checkpoint can generate cards.',
    inputSchema: {
      bookId: z.string().min(1),
      page: z.number().int().min(0).optional(),
      location: z.number().int().min(0).optional(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, ({ bookId, page, location }) => safely(() => {
    if ((page === undefined) === (location === undefined)) throw new Error('Provide either page or location');
    return page === undefined ? store.setReadingLocation(bookId, location!) : store.setReadingProgress(bookId, page);
  }));

  server.registerTool('add_highlight', {
    title: 'Save a book highlight',
    description: 'Save a quoted passage and optional note at a read page or location. Unread pages and locations are rejected.',
    inputSchema: {
      bookId: z.string().min(1),
      text: z.string().min(1),
      page: z.number().int().positive().optional(),
      location: z.number().int().positive().optional(),
      note: z.string().optional(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, ({ bookId, text, page, location, note }) => safely(() => {
    if ((page === undefined) === (location === undefined)) throw new Error('Provide either page or location');
    return store.addHighlight({ bookId, text, page, location, note });
  }));
}
