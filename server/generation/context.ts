import { getGenerationContext, type BookSource, type GenerationContext } from '../cortex/index.ts';
import { readBookPassages } from '../books/index.ts';
import type { StudyStore } from '../store/index.ts';

export async function loadGenerationContext(store: StudyStore, dataDir: string, asOf: string, maxPassages = 24): Promise<GenerationContext> {
  const bookSources: BookSource[] = [];
  for (const book of store.listBooks()) {
    if (!book.cortexBookId) continue;
    bookSources.push({
      ankiBookId: book.id,
      cortexBookId: book.cortexBookId,
      checkpoint: { page: book.currentPage || undefined, location: book.currentLocation || undefined },
      passages: await readBookPassages(dataDir, book.id),
      highlights: store.listHighlights(book.id).map(highlight => ({
        id: highlight.id, text: highlight.text, page: highlight.page, location: highlight.location,
      })),
    });
  }
  return getGenerationContext({ asOf, bookSources, maxPassages });
}
