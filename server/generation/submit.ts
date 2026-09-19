import type { GenerationContext, SourcePassage } from '../cortex/index.ts';
import type { CardInput, StudyStore } from '../store/index.ts';

export type ProposedCard = {
  sourcePassageId: string;
  type: 'basic' | 'cloze';
  question: string;
  answer: string;
  evidence: string;
  clozeText?: string;
};

const normalized = (value: string) => value.replace(/\s+/g, ' ').trim().toLocaleLowerCase();

function verifyProposal(proposal: ProposedCard, passage: SourcePassage): string | null {
  const quote = normalized(proposal.evidence);
  if (quote.length < 15 || !normalized(passage.text).includes(quote)) return 'Evidence must quote the cited passage';
  if (normalized(proposal.answer).length < 2 || !quote.includes(normalized(proposal.answer))) return 'Answer must appear in the evidence';
  if (normalized(proposal.question).length < 12) return 'Question is too short';
  if (proposal.type === 'cloze' && !proposal.clozeText?.includes('{{c1::')) return 'Cloze card needs {{c1::...}} text';
  return null;
}

function deckFor(store: StudyStore, passage: SourcePassage, context: GenerationContext) {
  const kind = passage.sourceType;
  const cortexId = kind === 'course' ? passage.courseId : passage.cortexBookId;
  const existing = store.listDecks().find(deck => deck.kind === kind && deck.cortexId === cortexId);
  if (existing) return existing;
  const name = kind === 'course'
    ? context.timeline.find(entry => entry.courseId === passage.courseId)?.courseName ?? passage.title
    : context.books.find(book => book.id === passage.cortexBookId)?.title ?? passage.title;
  return store.createDeck({ name, kind, cortexId });
}

export function submitGroundedCards(store: StudyStore, context: GenerationContext, runKey: string, proposals: ProposedCard[]) {
  if (!runKey.trim()) throw new Error('Run key required');
  const candidates = new Map(context.passages.map(passage => [passage.id, passage]));
  const cards: CardInput[] = [];
  const rejected: Array<{ index: number; reason: string }> = [];
  proposals.forEach((proposal, index) => {
    const passage = candidates.get(proposal.sourcePassageId);
    if (!passage) { rejected.push({ index, reason: 'Unknown or ineligible source passage' }); return; }
    const error = verifyProposal(proposal, passage);
    if (error) { rejected.push({ index, reason: error }); return; }
    const deck = deckFor(store, passage, context);
    cards.push({
      deckId: deck.id, type: proposal.type,
      front: proposal.question.trim(), back: proposal.answer.trim(),
      clozeText: proposal.clozeText,
      source: {
        type: passage.sourceType, id: passage.sourceId, title: passage.title,
        excerpt: proposal.evidence.trim(),
        section: passage.section ?? (passage.page ? `Page ${passage.page}` : passage.location ? `Location ${passage.location}` : undefined),
        page: passage.page, location: passage.location, eligibleOn: passage.eligibleOn,
      },
    });
  });
  const result = store.submitGeneratedCards({ runKey, date: context.asOf, cards });
  return { ...result, rejected: result.rejected + rejected.length, rejectionReasons: rejected };
}
