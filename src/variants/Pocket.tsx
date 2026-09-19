import { useState } from 'react';
import { ArrowRight, BookOpen, Check, ChevronRight, Layers3, RotateCcw, Sparkles } from 'lucide-react';
import { previewData as data } from '../data';
import type { DesignProps, PreviewScreen } from '../types';
import './Pocket.css';
import './Pocket.mobile.css';

type PocketProps = DesignProps & { mode: 'dark' | 'light' };
const tabs: { id: PreviewScreen; label: string; icon: typeof Layers3 }[] = [
  { id: 'home', label: 'Today', icon: Sparkles },
  { id: 'review', label: 'Review', icon: Layers3 },
  { id: 'books', label: 'Books', icon: BookOpen },
];
const grades = [
  { name: 'Again', time: '< 1m' }, { name: 'Hard', time: '3d' },
  { name: 'Mid', time: '6d' }, { name: 'Easy', time: '10d' }, { name: 'EZ', time: '18d' },
];

function Navigation({ screen, onScreenChange }: DesignProps) {
  return <nav className="pocket-nav" aria-label="Main navigation">
    {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button"
      className={screen === id ? 'active' : ''} onClick={() => onScreenChange(id)}
      aria-current={screen === id ? 'page' : undefined}>
      <Icon size={20} strokeWidth={1.9} /><span>{label}</span>
    </button>)}
  </nav>;
}

function SourceLine() {
  return <div className="pocket-source"><span className="pocket-source-mark">C3</span>
    <span><strong>{data.card.course}</strong><small>{data.card.source} · {data.card.citation}</small></span></div>;
}

function Home({ onScreenChange }: Pick<DesignProps, 'onScreenChange'>) {
  return <div className="pocket-home">
    <div className="pocket-heading"><span>{data.date}</span><h1>Ready for a quick round?</h1><p>Your next card is waiting.</p></div>
    <section className="pocket-next" aria-labelledby="pocket-next-title">
      <div className="pocket-next-top"><span>Up next</span><span className="pocket-step">13 / 30</span></div>
      <SourceLine />
      <h2 id="pocket-next-title">{data.card.question}</h2>
      <button className="pocket-primary" type="button" onClick={() => onScreenChange('review')}>Start reviewing <ArrowRight size={20} /></button>
    </section>
    <div className="pocket-side">
      <section className="pocket-progress" aria-label="Daily progress"><div><strong>{data.completed} <span>of {data.dailyLimit}</span></strong><span>cards today</span></div>
        <div className="pocket-progress-track"><span style={{ width: `${data.completed / data.dailyLimit * 100}%` }} /></div>
        <p>{data.due} due now <span>·</span> {data.newCards} new waiting</p>
      </section>
      <button className="pocket-reading" type="button" onClick={() => onScreenChange('books')}>
        <span className="pocket-book-glyph"><BookOpen size={23} /></span><span className="pocket-reading-copy"><small>Continue reading</small><strong>{data.book.title}</strong><span>Page {data.book.currentPage} · {data.book.newCards} cards from your notes</span></span><ChevronRight size={20} />
      </button>
    </div>
    <section className="pocket-queue"><div className="pocket-section-head"><h2>Coming up</h2><span>18 cards due</span></div>
      <div className="pocket-course-list">{data.courses.map(course => <button className="pocket-course" key={course.id} type="button" onClick={() => onScreenChange(course.id === 'books' ? 'books' : 'review')}>
        <span className="pocket-course-dot" style={{ background: course.color }} /><span className="pocket-course-copy"><strong>{course.name}</strong><small>{course.topic}</small></span><span className="pocket-due">{course.due}</span><ChevronRight size={18} />
      </button>)}</div>
    </section>
  </div>;
}

function Review() {
  const [revealed, setRevealed] = useState(false);
  const [lastGrade, setLastGrade] = useState<string | null>(null);
  return <div className="pocket-review">
    <div className="pocket-heading"><span>Review · {data.card.progress}</span><h1>One card at a time.</h1></div>
    <div className="pocket-review-layout"><section className="pocket-flashcard"><div className="pocket-card-top"><span>{data.card.type} card</span><span>13 / 30</span></div>
      <SourceLine /><h2>{data.card.question}</h2>
      {revealed ? <div className="pocket-answer"><span>Answer</span><p>{data.card.answer}</p></div> : <div className="pocket-think">Take a moment to recall it.</div>}
    </section><div className="pocket-review-controls">
      {lastGrade && <div className="pocket-confirm"><Check size={18} /> Rated {lastGrade} <button type="button" onClick={() => setLastGrade(null)}><RotateCcw size={15} /> Undo</button></div>}
      {!revealed ? <button className="pocket-primary" type="button" onClick={() => setRevealed(true)}>Show answer <ArrowRight size={20} /></button>
        : <><p>How well did you remember?</p><div className="pocket-grades">{grades.map(grade => <button key={grade.name} type="button" onClick={() => setLastGrade(grade.name)} className={lastGrade === grade.name ? 'selected' : ''}><strong>{grade.name}</strong><small>{grade.time}</small></button>)}</div></>}
      <p className="pocket-review-note">Every card keeps a link to its source.</p>
    </div></div>
  </div>;
}

function Books() {
  const [page, setPage] = useState<number>(data.book.currentPage);
  const [draft, setDraft] = useState(String(page));
  const [saved, setSaved] = useState(false);
  return <div className="pocket-books"><div className="pocket-heading"><span>Your library</span><h1>Read at your pace.</h1><p>Cards only use pages you have reached.</p></div>
    <div className="pocket-books-layout"><section className="pocket-book-feature"><div className="pocket-book-art"><BookOpen size={62} strokeWidth={1} /><span>48</span></div>
      <div className="pocket-book-details"><span>Currently reading</span><h2>{data.book.title}</h2><p>{data.book.author}</p><div className="pocket-book-stats"><span><strong>{page}</strong> current page</span><span><strong>{data.book.highlights}</strong> highlights</span></div></div>
    </section><section className="pocket-checkpoint"><span className="pocket-section-kicker">Reading checkpoint</span><h2>Where did you stop?</h2><p>New cards will use this page and earlier pages.</p>
      <form onSubmit={event => { event.preventDefault(); const next = Number(draft); if (Number.isInteger(next) && next > 0) { setPage(next); setSaved(true); } }}><label htmlFor="pocket-page">Current page</label><div><input id="pocket-page" type="number" min="1" value={draft} onChange={event => { setDraft(event.target.value); setSaved(false); }} /><button type="submit">Save page <ArrowRight size={18} /></button></div></form>
      {saved && <p className="pocket-saved"><Check size={16} /> Saved at page {page}</p>}
    </section></div>
  </div>;
}

export function Pocket({ mode, screen, onScreenChange }: PocketProps) {
  return <div className={`pocket-app pocket-${mode}`}><div className="pocket-shell"><header className="pocket-header">
    <button className="pocket-brand" type="button" onClick={() => onScreenChange('home')} aria-label="Anki home"><span className="pocket-logo"><Layers3 size={20} /></span><strong>anki</strong></button>
    <Navigation screen={screen} onScreenChange={onScreenChange} /><span className="pocket-avatar" aria-label="Pablo">P</span>
  </header><main>{screen === 'home' ? <Home onScreenChange={onScreenChange} /> : screen === 'review' ? <Review /> : <Books />}</main></div></div>;
}
