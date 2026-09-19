import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { ArrowUp, Check, RotateCcw } from 'lucide-react';
import { api, type Card, type Queue, type Rating } from './api';
import { Source, Status } from './LiveShared';

const grades: { id: Rating; label: string }[] = [
  { id: 'again', label: 'Again' }, { id: 'hard', label: 'Hard' },
  { id: 'mid', label: 'Mid' }, { id: 'easy', label: 'Easy' }, { id: 'ez', label: 'EZ' },
];
const motionOff = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function LiveReview() {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [drag, setDrag] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [entering, setEntering] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastReview, setLastReview] = useState<{ id: string; rating: string } | null>(null);
  const startY = useRef<number | null>(null);
  const lastDy = useRef(0);

  async function load() {
    setLoading(true);
    setError('');
    try { setQueue(await api.queue()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load cards.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (revealed || busy) return;
    startY.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: PointerEvent<HTMLElement>) {
    if (startY.current === null || revealed || busy) return;
    lastDy.current = Math.max(-110, Math.min(0, event.clientY - startY.current));
    setDrag(lastDy.current);
  }
  function onPointerUp() {
    if (lastDy.current <= -68) setRevealed(true);
    startY.current = null;
    lastDy.current = 0;
    setDrag(0);
  }
  function onCardKey(event: KeyboardEvent<HTMLElement>) {
    if (!revealed && (event.key === ' ' || event.key === 'Enter')) { event.preventDefault(); setRevealed(true); }
  }

  async function grade(card: Card, rating: Rating) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      setLeaving(true);
      if (!motionOff()) await new Promise(resolve => window.setTimeout(resolve, 220));
      const result = await api.grade(card.id, rating);
      const next = await api.queue();
      setQueue(next);
      setLastReview({ id: result.reviewId, rating: grades.find(item => item.id === rating)!.label });
      setRevealed(false);
      setLeaving(false);
      setEntering(true);
      window.setTimeout(() => setEntering(false), motionOff() ? 0 : 320);
    } catch (reason) {
      setLeaving(false);
      setError(reason instanceof Error ? reason.message : 'Could not save this rating.');
    } finally { setBusy(false); }
  }

  async function undo() {
    if (!lastReview || busy) return;
    setBusy(true);
    setError('');
    try { await api.undo(lastReview.id); setQueue(await api.queue()); setLastReview(null); setRevealed(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not undo the rating.'); }
    finally { setBusy(false); }
  }

  const card = queue?.cards[0];
  return <div className="pocket-review live-review"><div className="pocket-heading"><span>Review · {queue ? `${queue.reviewedToday} of ${queue.dailyLimit}` : 'Today'}</span><h1>One card at a time.</h1></div>
    {!queue && <Status loading={loading} error={error} retry={() => void load()} />}
    {queue && <><div className="live-review-meta"><span>{queue.dueCount} due</span><span>{queue.newCount} new</span><span>{queue.remaining} left today</span></div>
      {queue.backlogCount > 0 && <p className="live-backlog">{queue.backlogCount} overdue cards remain visible in your backlog.</p>}
      {lastReview && <div className="pocket-confirm live-undo"><Check size={18} /> Rated {lastReview.rating}<button type="button" onClick={() => void undo()} disabled={busy}><RotateCcw size={15} /> Undo</button></div>}
      {error && <div className="live-inline-error" role="alert">{error}</div>}
      {card ? <div className="pocket-review-layout"><section className={`pocket-flashcard live-flashcard ${revealed ? 'is-revealed' : ''} ${leaving ? 'is-leaving' : ''} ${entering ? 'is-entering' : ''}`}
        style={{ '--drag-y': `${drag}px` } as CSSProperties} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { startY.current = null; lastDy.current = 0; setDrag(0); }}
        onKeyDown={onCardKey} tabIndex={revealed ? -1 : 0} role={revealed ? undefined : 'button'} aria-label={revealed ? undefined : 'Review card. Swipe up or press Enter to reveal answer.'}>
        <div className="pocket-card-top"><span>{card.type === 'cloze' ? 'Cloze' : 'Basic'} card</span><span>{queue.reviewedToday + 1} / {queue.dailyLimit}</span></div>
        <Source card={card} /><h2>{card.question}</h2>
        {revealed ? <div className="pocket-answer"><span>Answer</span><p>{card.answer}</p></div> : <div className="pocket-think live-swipe-hint"><ArrowUp size={17} /> Swipe up or tap below to reveal</div>}
      </section><div className="pocket-review-controls">{!revealed ? <button className="pocket-primary" type="button" onClick={() => setRevealed(true)}>Show answer <ArrowUp size={19} /></button>
        : <><p>How well did you remember?</p><div className="pocket-grades">{grades.map(item => <button key={item.id} type="button" disabled={busy} onClick={() => void grade(card, item.id)}><strong>{item.label}</strong></button>)}</div></>}
      </div></div>
        : <div className="live-empty live-done"><h2>{queue.reviewedToday >= queue.dailyLimit ? 'Daily limit reached' : 'You’re caught up'}</h2><p>{queue.reviewedToday >= queue.dailyLimit ? 'You reviewed 30 distinct cards today. Due cards remain in the backlog for tomorrow.' : 'No cards are ready right now.'}</p></div>}
    </>}
  </div>;
}
