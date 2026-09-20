import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { RotateCcw } from 'lucide-react';
import { api, type Card, type Queue, type Rating } from './api';
import { Source, Status } from './LiveShared';
import { clozeDisplay } from './cloze';
import { flipAngle, frontDragScrolls, keyboardRating, reviewSwipeAction, swipeRating } from './reviewGesture';

const grades: { id: Rating; label: string; direction: string }[] = [
  { id: 'again', label: 'Again', direction: '←' },
  { id: 'hard', label: 'Hard', direction: '↓' },
  { id: 'mid', label: 'Mid', direction: '·' },
  { id: 'easy', label: 'Easy', direction: '→' },
  { id: 'ez', label: 'EZ', direction: '↑' },
];
const motionOff = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const turnDurationMs = 880;
const exitDurationMs = 410;
const enterDurationMs = 340;

export function LiveReview() {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [turning, setTurning] = useState(false);
  const [aimRating, setAimRating] = useState<Rating | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [flipDrag, setFlipDrag] = useState(0);
  const [leavingRating, setLeavingRating] = useState<Rating | null>(null);
  const [enteringRating, setEnteringRating] = useState<Rating | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastReview, setLastReview] = useState<{ id: string; rating: string } | null>(null);
  const pointerStart = useRef<{ x: number; y: number; allowVertical: boolean; frontScrollTop: number; scrolledFront: boolean } | null>(null);
  const cardRegion = useRef<HTMLElement>(null);
  const frontScrollRegion = useRef<HTMLDivElement>(null);
  const scrollRegion = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const suppressClick = useRef(false);
  const focusNextCard = useRef(false);
  const turnTimer = useRef<number | null>(null);
  const enterTimer = useRef<number | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    setRevealed(false);
    setTurning(false);
    setEnteringRating(null);
    if (turnTimer.current !== null) window.clearTimeout(turnTimer.current);
    if (enterTimer.current !== null) window.clearTimeout(enterTimer.current);
    turnTimer.current = null;
    enterTimer.current = null;
    resetDrag();
    try { setQueue(await api.queue()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load cards.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => () => {
    if (turnTimer.current !== null) window.clearTimeout(turnTimer.current);
    if (enterTimer.current !== null) window.clearTimeout(enterTimer.current);
  }, []);

  function resetDrag() {
    pointerStart.current = null;
    setAimRating(null);
    setFlipping(false);
    setFlipDrag(0);
  }
  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (inFlight.current || turning) return;
    suppressClick.current = false;
    const inScrollableContent = revealed && event.target instanceof Element && Boolean(event.target.closest('.live-card-scroll'));
    pointerStart.current = { x: event.clientX, y: event.clientY, allowVertical: !inScrollableContent,
      frontScrollTop: frontScrollRegion.current?.scrollTop ?? 0, scrolledFront: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: PointerEvent<HTMLElement>) {
    if (!pointerStart.current || inFlight.current) return;
    const x = event.clientX - pointerStart.current.x;
    const y = event.clientY - pointerStart.current.y;
    if (Math.hypot(x, y) < 5) return;
    suppressClick.current = true;
    if (!revealed) {
      const front = frontScrollRegion.current;
      if (front) {
        const maxScroll = front.scrollHeight - front.clientHeight;
        if (pointerStart.current.scrolledFront || frontDragScrolls(y, pointerStart.current.frontScrollTop, maxScroll)) {
          front.scrollTop = Math.max(0, Math.min(maxScroll, pointerStart.current.frontScrollTop - y));
          pointerStart.current.scrolledFront = true;
          return;
        }
      }
      if (y < 0 && -y > Math.abs(x) * 1.35 && !motionOff()) {
        setFlipping(true);
        setFlipDrag(flipAngle(y));
      }
      return;
    }
    if (!pointerStart.current.allowVertical && Math.abs(y) > Math.abs(x)) {
      setAimRating(null);
      return;
    }
    setAimRating(swipeRating(x, y, pointerStart.current.allowVertical));
  }
  function onPointerUp(event: PointerEvent<HTMLElement>, card: Card) {
    if (!pointerStart.current) return;
    if (pointerStart.current.scrolledFront) { resetDrag(); return; }
    const action = reviewSwipeAction(event.clientX - pointerStart.current.x, event.clientY - pointerStart.current.y, revealed, pointerStart.current.allowVertical);
    resetDrag();
    if (action === 'reveal') reveal();
    else if (action) void grade(card, action);
  }
  function reveal() {
    if (revealed || inFlight.current) return;
    setRevealed(true);
    if (motionOff()) {
      window.requestAnimationFrame(() => scrollRegion.current?.focus());
      return;
    }
    setTurning(true);
    turnTimer.current = window.setTimeout(completeTurn, turnDurationMs + 120);
  }
  function completeTurn() {
    if (turnTimer.current === null) return;
    window.clearTimeout(turnTimer.current);
    turnTimer.current = null;
    setTurning(false);
    window.requestAnimationFrame(() => scrollRegion.current?.focus());
  }
  function onCardKey(event: KeyboardEvent<HTMLElement>, card: Card) {
    if (!revealed && (event.key === ' ' || event.key === 'Enter')) {
      event.preventDefault();
      reveal();
      return;
    }
    const rating = revealed && !turning ? keyboardRating(event.key) : null;
    if (rating) { event.preventDefault(); void grade(card, rating); }
  }

  async function grade(card: Card, rating: Rating) {
    if (inFlight.current || turning) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    let saved = false;
    try {
      setLeavingRating(rating);
      if (!motionOff()) await new Promise(resolve => window.setTimeout(resolve, exitDurationMs));
      const result = await api.grade(card.id, rating);
      saved = true;
      setLastReview({ id: result.reviewId, rating: grades.find(item => item.id === rating)!.label });
      const nextQueue = await api.queue();
      focusNextCard.current = true;
      setQueue(nextQueue);
      setRevealed(false);
      setTurning(false);
      setLeavingRating(null);
      setEnteringRating(rating);
      if (enterTimer.current !== null) window.clearTimeout(enterTimer.current);
      enterTimer.current = window.setTimeout(() => {
        setEnteringRating(null);
        enterTimer.current = null;
      }, motionOff() ? 0 : enterDurationMs);
    } catch (reason) {
      setLeavingRating(null);
      if (saved) setQueue(null);
      setError(saved ? 'Rating saved, but the next card did not load. Try again.' : reason instanceof Error ? reason.message : 'Could not save this rating.');
    } finally { inFlight.current = false; setBusy(false); }
  }

  async function undo() {
    if (!lastReview || inFlight.current || turning) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      await api.undo(lastReview.id);
      const restoredQueue = await api.queue();
      focusNextCard.current = true;
      setQueue(restoredQueue);
      setLastReview(null);
      setRevealed(false);
      setTurning(false);
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not undo the rating.'); }
    finally { inFlight.current = false; setBusy(false); }
  }

  const card = queue?.cards[0];
  useEffect(() => {
    if (!focusNextCard.current || revealed) return;
    focusNextCard.current = false;
    cardRegion.current?.focus();
  }, [queue, revealed]);
  return <div className="pocket-review live-review soft-live-review">
    <div className="live-review-top"><div><h1>Review</h1><span>{queue ? `${queue.reviewedToday} / ${queue.dailyLimit} today` : 'Your cards'}</span></div>
      {lastReview && <div className="live-review-undo"><span role="status">Rated {lastReview.rating}</span><button type="button" onClick={() => void undo()} disabled={busy || turning}><RotateCcw size={16} /> Undo</button></div>}
    </div>
    {queue && <div className="soft-live-review-progress" aria-label={`${queue.reviewedToday} of ${queue.dailyLimit} cards reviewed today`}><span style={{ width: `${Math.min(100, queue.reviewedToday / Math.max(1, queue.dailyLimit) * 100)}%` }} /></div>}
    {!queue && <Status loading={loading} error={error} retry={() => void load()} />}
    {queue && <>
      {error && <div className="live-inline-error" role="alert">{error}</div>}
      {card ? <div className="pocket-review-layout"><section ref={cardRegion} className={`pocket-flashcard live-flashcard ${revealed ? 'is-revealed' : ''} ${revealed && !turning ? 'is-turned' : ''} ${turning ? 'is-turning' : ''} ${leavingRating ? `is-leaving is-leaving-${leavingRating}` : ''} ${enteringRating ? `is-entering is-entering-${enteringRating}` : ''}`}
        style={{ '--flip-angle': `${flipDrag}deg`, '--turn-duration': `${turnDurationMs}ms` } as CSSProperties}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={event => onPointerUp(event, card)} onPointerCancel={resetDrag}
        onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } reveal(); }} onKeyDown={event => onCardKey(event, card)}
        tabIndex={0} role={revealed ? 'group' : 'button'} aria-label={turning ? 'Turning card to reveal the answer.' : revealed ? 'Answer revealed. Swipe left for Again, down for Hard, right for Easy, or up for EZ. Tap Mid or press 1 through 5 to rate.' : `${card.type === 'cloze' && card.clozeText ? clozeDisplay(card.clozeText, false) : card.question} Swipe up, tap, or press Enter to reveal the answer.`}>
        <div className={`live-flip-inner ${flipping ? 'is-flipping' : ''}`} key={card.id}
          onTransitionEnd={event => { if (event.target === event.currentTarget && event.propertyName === 'transform') completeTurn(); }}>
          <div className="live-flip-face live-flip-front" aria-hidden={revealed && !turning} inert={revealed && !turning}>
            <div className="live-card-scroll" ref={frontScrollRegion}><Source card={card} />
              <h2>{card.type === 'cloze' && card.clozeText ? clozeDisplay(card.clozeText, false) : card.question}</h2>
              <p className="live-reveal-prompt"><span aria-hidden="true">↑</span> Swipe up to flip</p>
            </div>
          </div>
          <div className="live-flip-face live-flip-back" aria-hidden={!revealed || turning} inert={!revealed || turning}>
            <div className="live-card-scroll" ref={scrollRegion} role="region" aria-label="Answer" tabIndex={revealed && !turning ? 0 : -1}>
              <Source card={card} />
              <span className="live-answer-eyebrow">Answer</span>
              <p className="live-answer-question">{card.type === 'cloze' && card.clozeText ? clozeDisplay(card.clozeText, true) : card.question}</p>
              <div className="pocket-answer"><p>{card.answer}</p></div>
            </div>
            <div className="live-swipe-pad" aria-hidden="true">← Again · ↓ Hard · → Easy · ↑ EZ</div>
          </div>
        </div>
      </section><div className={`pocket-review-controls ${turning ? 'is-turning' : ''}`}>{!revealed ? <button className="pocket-primary" type="button" onClick={reveal}>Show answer</button>
        : <><p className="live-rating-hint" aria-hidden={turning}>{aimRating ? `Release for ${grades.find(item => item.id === aimRating)?.label}` : 'Swipe a direction or tap Mid'}</p><div className="pocket-grades" aria-label="Rate this card" aria-hidden={turning} inert={turning}>{grades.map(item => <button key={item.id} className={aimRating === item.id ? 'is-aimed' : ''} type="button" disabled={busy || turning} onClick={() => void grade(card, item.id)} aria-label={`Rate ${item.label}`}><span aria-hidden="true">{item.direction}</span><strong>{item.label}</strong></button>)}</div></>}
      </div></div>
        : <div className="live-empty live-done"><h2>{queue.reviewedToday >= queue.dailyLimit ? 'Daily limit reached' : 'You’re caught up'}</h2><p>{queue.reviewedToday >= queue.dailyLimit ? 'You reviewed 30 distinct cards today. Due cards remain in the backlog for tomorrow.' : 'No cards are ready right now.'}</p>{queue.backlogCount > 0 && <p>{queue.backlogCount} overdue cards remain in your backlog.</p>}</div>}
    </>}
  </div>;
}
