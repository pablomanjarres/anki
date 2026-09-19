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

function cardQualityError(proposal: ProposedCard): string | null {
  const answer = proposal.answer.trim();
  const question = normalized(proposal.question).replace(/^¿\s*/, '');
  if (answer.length > 60 || answer.split(/\s+/).length > 6) {
    return 'Answer must be one short fact, at most six words';
  }
  if (/^(?:enumera|menciona|lista|list|name some)\b/.test(question) ||
      /^qué\s+(?:problemas|ventajas|beneficios|características|pasos)\s+comunes\b/.test(question) ||
      /^what\s+are\s+(?:the\s+)?(?:common\s+)?(?:problems|benefits|advantages|features|steps)\b/.test(question)) {
    return 'Question must ask for one specific fact, not a list';
  }
  return null;
}

function verifyProposal(proposal: ProposedCard, passage: SourcePassage): string | null {
  const quote = normalized(proposal.evidence);
  if (quote.length < 15 || !normalized(passage.text).includes(quote)) return 'Evidence must quote the cited passage';
  if (normalized(proposal.answer).length < 2 || !quote.includes(normalized(proposal.answer))) return 'Answer must appear in the evidence';
  if (normalized(proposal.question).length < 12) return 'Question is too short';
  const qualityError = cardQualityError(proposal);
  if (qualityError) return qualityError;
  if (proposal.type === 'cloze') {
    const deletion = proposal.clozeText?.match(/\{\{c1::([^}:]+)(?:::[^}]+)?\}\}/);
    if (!deletion) return 'Cloze card needs {{c1::...}} text';
    if (normalized(deletion[1]) !== normalized(proposal.answer)) return 'Cloze deletion must match the answer';
  }
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
  return store.submitGeneratedCards({ runKey, date: context.asOf, cards, rejections: rejected });
}
