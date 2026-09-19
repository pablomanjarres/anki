import { useEffect, useState, type FormEvent } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api, type Card, type CardType, type Deck } from './api';
import { Source, Status } from './LiveShared';

type Draft = { deckId: string; type: CardType; question: string; answer: string; clozeText: string; sourceTitle: string; sourceLocator: string; sourceExcerpt: string };
const emptyDraft: Draft = { deckId: '', type: 'basic', question: '', answer: '', clozeText: '', sourceTitle: '', sourceLocator: '', sourceExcerpt: '' };

export function LiveCards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [query, setQuery] = useState('');
  const [deckFilter, setDeckFilter] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newDeck, setNewDeck] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadDecks() { setDecks((await api.decks()).decks); }
  async function loadCards() { setCards((await api.cards(query, deckFilter)).cards); }
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([api.decks(), api.cards(query, deckFilter)])
      .then(([deckData, cardData]) => { if (active) { setDecks(deckData.decks); setCards(cardData.cards); setError(''); } })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load cards.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, deckFilter]);

  function startCreate() { setEditingId(null); setDraft({ ...emptyDraft, deckId: deckFilter || decks[0]?.id || '' }); }
  function startEdit(card: Card) {
    setEditingId(card.id);
    setDraft({ deckId: card.deckId, type: card.type, question: card.question, answer: card.answer, clozeText: card.clozeText || '', sourceTitle: card.sourceTitle, sourceLocator: card.sourceLocator, sourceExcerpt: card.sourceExcerpt || '' });
  }
  function change<K extends keyof Draft>(key: K, value: Draft[K]) { setDraft(current => current && { ...current, [key]: value }); }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft || busy) return;
    setBusy(true); setError('');
    try {
      if (editingId) await api.updateCard(editingId, draft);
      else await api.createCard(draft);
      setDraft(null); setEditingId(null); await Promise.all([loadCards(), loadDecks()]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save card.'); }
    finally { setBusy(false); }
  }
  async function removeCard(card: Card) {
    if (!window.confirm(`Delete this card from ${card.deckName}?`)) return;
    setBusy(true); setError('');
    try { await api.deleteCard(card.id); await Promise.all([loadCards(), loadDecks()]); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not delete card.'); }
    finally { setBusy(false); }
  }
  async function addDeck(event: FormEvent) {
    event.preventDefault(); if (!newDeck.trim()) return;
    setBusy(true); setError('');
    try { const deck = await api.createDeck(newDeck.trim()); setNewDeck(''); await loadDecks(); setDeckFilter(deck.id); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create deck.'); }
    finally { setBusy(false); }
  }
  async function renameDeck(deck: Deck) {
    const name = window.prompt('Deck name', deck.name)?.trim(); if (!name || name === deck.name) return;
    setBusy(true); setError('');
    try { await api.updateDeck(deck.id, name); await loadDecks(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not rename deck.'); }
    finally { setBusy(false); }
  }
  async function removeDeck(deck: Deck) {
    if (!window.confirm(`Delete “${deck.name}” and its cards?`)) return;
    setBusy(true); setError('');
    try { await api.deleteDeck(deck.id); setDeckFilter(''); await Promise.all([loadDecks(), loadCards()]); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not delete deck.'); }
    finally { setBusy(false); }
  }

  return <div className="live-library"><div className="pocket-heading"><span>Your collection</span><h1>Cards and decks.</h1><p>Keep each idea connected to its source.</p></div>
    <div className="live-library-actions"><label className="live-search"><Search size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search cards" aria-label="Search cards" /></label>
      <select aria-label="Filter by deck" value={deckFilter} onChange={event => setDeckFilter(event.target.value)}><option value="">All decks</option>{decks.map(deck => <option key={deck.id} value={deck.id}>{deck.name}</option>)}</select>
      <button type="button" className="live-action" onClick={startCreate}><Plus size={18} /> New card</button></div>
    {error && <div className="live-inline-error" role="alert">{error}</div>}
    {draft && <form className="live-editor" onSubmit={event => void save(event)}><div className="pocket-section-head"><h2>{editingId ? 'Edit card' : 'New card'}</h2><button type="button" onClick={() => setDraft(null)}>Close</button></div>
      <div className="live-form-row"><label>Deck<select required value={draft.deckId} onChange={event => change('deckId', event.target.value)}><option value="">Select a deck</option>{decks.map(deck => <option key={deck.id} value={deck.id}>{deck.name}</option>)}</select></label>
        <label>Type<select value={draft.type} onChange={event => change('type', event.target.value as CardType)}><option value="basic">Basic</option><option value="cloze">Cloze</option></select></label></div>
      <label>Question<textarea required value={draft.question} onChange={event => change('question', event.target.value)} rows={3} /></label>
      <label>Answer<textarea required value={draft.answer} onChange={event => change('answer', event.target.value)} rows={3} /></label>
      {draft.type === 'cloze' && <label>Cloze sentence<textarea required value={draft.clozeText} onChange={event => change('clozeText', event.target.value)} placeholder="The {{c1::answer}} belongs here." rows={3} /></label>}
      <div className="live-form-row"><label>Source title<input required value={draft.sourceTitle} onChange={event => change('sourceTitle', event.target.value)} /></label><label>Page or section<input required value={draft.sourceLocator} onChange={event => change('sourceLocator', event.target.value)} /></label></div>
      <label>Source passage (optional)<textarea value={draft.sourceExcerpt} onChange={event => change('sourceExcerpt', event.target.value)} rows={2} /></label><button className="live-action" type="submit" disabled={busy || !decks.length}>Save card</button></form>}
    {!draft && <><Status loading={loading} error={cards.length ? '' : error} retry={() => void Promise.all([loadCards(), loadDecks()])} />
      <div className="live-card-list">{cards.map(card => <article className="live-card-row" key={card.id}><Source card={card} /><h2>{card.question}</h2><p>{card.answer}</p><div className="live-row-actions"><button type="button" onClick={() => startEdit(card)}><Pencil size={16} /> Edit</button><button type="button" disabled={busy} onClick={() => void removeCard(card)}><Trash2 size={16} /> Delete</button></div></article>)}</div>
      {!loading && !error && !cards.length && <div className="live-empty">No cards found. Create one, or change your search.</div>}
    </>}
    <section className="live-decks"><div className="pocket-section-head"><h2>Decks</h2><span>{decks.length}</span></div><form onSubmit={event => void addDeck(event)}><input aria-label="New deck name" placeholder="New deck name" value={newDeck} onChange={event => setNewDeck(event.target.value)} /><button type="submit" disabled={busy}>Add deck</button></form>
      {decks.map(deck => <div className="live-deck-row" key={deck.id}><span><strong>{deck.name}</strong><small>{deck.cardCount} cards · {deck.dueCount} due</small></span><button type="button" onClick={() => void renameDeck(deck)} aria-label={`Rename ${deck.name}`}><Pencil size={17} /></button><button type="button" onClick={() => void removeDeck(deck)} aria-label={`Delete ${deck.name}`}><Trash2 size={17} /></button></div>)}</section>
  </div>;
}
