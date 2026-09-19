import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { RotateCcw } from 'lucide-react';
import { api, type Card, type Queue, type Rating } from './api';
import { Source, Status } from './LiveShared';
import { clozeDisplay } from './cloze';
import { keyboardRating, swipeRating } from './reviewGesture';

const grades: { id: Rating; label: string; direction: string }[] = [
  { id: 'again', label: 'Again', direction: '←' },
  { id: 'hard', label: 'Hard', direction: '↓' },
  { id: 'mid', label: 'Mid', direction: '·' },
  { id: 'easy', label: 'Easy', direction: '→' },
  { id: 'ez', label: 'EZ', direction: '↑' },
];
const motionOff = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function LiveReview() {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [leavingRating, setLeavingRating] = useState<Rating | null>(null);
  const [entering, setEntering] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastReview, setLastReview] = useState<{ id: string; rating: string } | null>(null);
  const pointerStart = useRef<{ x: number; y: number; allowVertical: boolean } | null>(null);
  const scrollRegion = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);

  async function load() {
    setLoading(true);
    setError('');
    setRevealed(false);
    resetDrag();
    try { setQueue(await api.queue()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load cards.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  function resetDrag() {
    pointerStart.current = null;
    setDragging(false);
    setDrag({ x: 0, y: 0 });
  }
  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (!revealed || inFlight.current) return;
    const inScrollableContent = event.target instanceof Element && Boolean(event.target.closest('.live-card-scroll'));
    pointerStart.current = { x: event.clientX, y: event.clientY, allowVertical: !inScrollableContent };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: PointerEvent<HTMLElement>) {
    if (!pointerStart.current || inFlight.current) return;
    const x = event.clientX - pointerStart.current.x;
    const y = event.clientY - pointerStart.current.y;
    if (Math.hypot(x, y) < 5) return;
    if (!pointerStart.current.allowVertical && Math.abs(y) > Math.abs(x)) return;
    setDragging(true);
    if (!motionOff()) setDrag({ x: Math.max(-125, Math.min(125, x)), y: pointerStart.current.allowVertical ? Math.max(-125, Math.min(125, y)) : 0 });
  }
  function onPointerUp(event: PointerEvent<HTMLElement>, card: Card) {
    if (!pointerStart.current) return;
    const rating = swipeRating(event.clientX - pointerStart.current.x, event.clientY - pointerStart.current.y, pointerStart.current.allowVertical);
    resetDrag();
    if (rating) void grade(card, rating);
  }
  function onCardKey(event: KeyboardEvent<HTMLElement>, card: Card) {
    if (!revealed && (event.key === ' ' || event.key === 'Enter')) {
      event.preventDefault();
      setRevealed(true);
      window.requestAnimationFrame(() => scrollRegion.current?.focus());
      return;
    }
    const rating = revealed ? keyboardRating(event.key) : null;
    if (rating) { event.preventDefault(); void grade(card, rating); }
  }

  async function grade(card: Card, rating: Rating) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    let saved = false;
    try {
      setLeavingRating(rating);
      if (!motionOff()) await new Promise(resolve => window.setTimeout(resolve, 230));
      const result = await api.grade(card.id, rating);
      saved = true;
      setLastReview({ id: result.reviewId, rating: grades.find(item => item.id === rating)!.label });
      setQueue(await api.queue());
      setRevealed(false);
      setLeavingRating(null);
      setEntering(true);
      window.setTimeout(() => setEntering(false), motionOff() ? 0 : 280);
    } catch (reason) {
      setLeavingRating(null);
      if (saved) setQueue(null);
      setError(saved ? 'Rating saved, but the next card did not load. Try again.' : reason instanceof Error ? reason.message : 'Could not save this rating.');
    } finally { inFlight.current = false; setBusy(false); }
  }

  async function undo() {
    if (!lastReview || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try { await api.undo(lastReview.id); setQueue(await api.queue()); setLastReview(null); setRevealed(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not undo the rating.'); }
    finally { inFlight.current = false; setBusy(false); }
  }

  const card = queue?.cards[0];
  return <div className="pocket-review live-review">
    <div className="live-review-top"><div><h1>Review</h1><span>{queue ? `${queue.reviewedToday} / ${queue.dailyLimit} today` : 'Your cards'}</span></div>
      {lastReview && <div className="live-review-undo"><span role="status">Rated {lastReview.rating}</span><button type="button" onClick={() => void undo()} disabled={busy}><RotateCcw size={16} /> Undo</button></div>}
    </div>
    {!queue && <Status loading={loading} error={error} retry={() => void load()} />}
    {queue && <>
      {error && <div className="live-inline-error" role="alert">{error}</div>}
      {card ? <div className="pocket-review-layout"><section className={`pocket-flashcard live-flashcard ${revealed ? 'is-revealed' : ''} ${dragging ? 'is-dragging' : ''} ${leavingRating ? `is-leaving is-leaving-${leavingRating}` : ''} ${entering ? 'is-entering' : ''}`}
        style={{ '--drag-x': `${drag.x}px`, '--drag-y': `${drag.y}px` } as CSSProperties}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={event => onPointerUp(event, card)} onPointerCancel={resetDrag}
        onClick={() => { if (!revealed && !busy) setRevealed(true); }} onKeyDown={event => onCardKey(event, card)}
        tabIndex={0} role={revealed ? 'group' : 'button'} aria-label={revealed ? 'Answer revealed. Scroll the question and answer. Swipe left or right on the card, or use the swipe handle for all directions. Press 1 through 5 to rate.' : `${card.type === 'cloze' && card.clozeText ? clozeDisplay(card.clozeText, false) : card.question} Tap or press Enter to reveal the answer.`}>
        <div className="live-card-scroll" ref={scrollRegion} role="region" aria-label="Question and answer" tabIndex={revealed ? 0 : -1}><Source card={card} />
          <h2>{card.type === 'cloze' && card.clozeText ? clozeDisplay(card.clozeText, revealed) : card.question}</h2>
          {revealed ? <div className="pocket-answer"><span>Answer</span><p>{card.answer}</p></div> : <p className="live-reveal-prompt">Tap to reveal</p>}
        </div>
        {revealed && <div className="live-swipe-pad" aria-hidden="true">Swipe here in any direction</div>}
      </section><div className="pocket-review-controls">{!revealed ? <button className="pocket-primary" type="button" onClick={() => setRevealed(true)}>Show answer</button>
        : <><p className="live-rating-hint">Swipe a direction or tap a rating</p><div className="pocket-grades" aria-label="Rate this card">{grades.map(item => <button key={item.id} type="button" disabled={busy} onClick={() => void grade(card, item.id)} aria-label={`Rate ${item.label}`}><span aria-hidden="true">{item.direction}</span><strong>{item.label}</strong></button>)}</div></>}
      </div></div>
        : <div className="live-empty live-done"><h2>{queue.reviewedToday >= queue.dailyLimit ? 'Daily limit reached' : 'You’re caught up'}</h2><p>{queue.reviewedToday >= queue.dailyLimit ? 'You reviewed 30 distinct cards today. Due cards remain in the backlog for tomorrow.' : 'No cards are ready right now.'}</p>{queue.backlogCount > 0 && <p>{queue.backlogCount} overdue cards remain in your backlog.</p>}</div>}
    </>}
  </div>;
}
