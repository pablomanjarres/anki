import { useState } from 'react';
import {
  ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Command,
  Layers3, LibraryBig, RotateCcw, Sparkles,
} from 'lucide-react';
import type { DesignProps, PreviewScreen } from '../types';
import { previewData as data } from '../data';
import './Focus.css';
import './Focus.mobile.css';

const sections: { id: PreviewScreen; label: string; icon: typeof Layers3 }[] = [
  { id: 'home', label: 'Today', icon: Layers3 },
  { id: 'review', label: 'Review', icon: RotateCcw },
  { id: 'books', label: 'Books', icon: BookOpen },
];

function FocusNav({ screen, onScreenChange }: DesignProps) {
  return <nav className="focus-nav" aria-label="Main navigation">
    <div className="focus-brand"><span className="focus-brand-mark"><Command size={19} strokeWidth={2.2} /></span><span>anki<span className="focus-brand-period">.</span></span></div>
    <div className="focus-nav-links">{sections.map(({ id, label, icon: Icon }) =>
      <button key={id} type="button" aria-current={screen === id ? 'page' : undefined} className={`focus-nav-link ${screen === id ? 'is-current' : ''}`} onClick={() => onScreenChange(id)}>
        <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
      </button>)}</div>
    <div className="focus-nav-foot"><span className="focus-sync-dot" />Cortex connected</div>
  </nav>;
}

function FocusTop({ title, detail }: { title: string; detail: string }) {
  return <header className="focus-top">
    <div><p className="focus-top-detail">{detail}</p><h1>{title}</h1></div>
    <div className="focus-top-actions"><span className="focus-avatar" aria-label="Pablo">P</span></div>
  </header>;
}

function FocusHome({ onScreenChange }: Pick<DesignProps, 'onScreenChange'>) {
  return <main className="focus-main focus-home">
    <FocusTop title="Today, in focus." detail={data.date} />
    <section className="focus-home-grid">
      <div className="focus-primary">
        <div className="focus-queue-heading"><div><span className="focus-status-line"><span className="focus-status-dot" /> Ready when you are</span><h2>Make room for what matters.</h2></div><span className="focus-streak">{data.streak} day streak</span></div>
        <div className="focus-next-card">
          <div className="focus-card-topline"><span>Up next</span><span>{data.card.course} / {data.card.topic}</span></div>
          <p className="focus-next-question">{data.card.question}</p>
          <div className="focus-card-bottom"><span>From {data.card.source}</span><button className="focus-round-next" type="button" onClick={() => onScreenChange('review')} aria-label="Start review"><ArrowRight size={23} /></button></div>
        </div>
        <button className="focus-start-button" type="button" onClick={() => onScreenChange('review')}>Start reviewing <ArrowRight size={18} /></button>
      </div>
      <aside className="focus-today-panel" aria-label="Today's study plan">
        <div className="focus-panel-head"><span>Today’s pace</span><span>{data.completed} / {data.dailyLimit}</span></div>
        <div className="focus-progress-track"><span style={{ width: `${data.completed / data.dailyLimit * 100}%` }} /></div>
        <p className="focus-panel-caption">{data.due} cards left in your daily plan</p>
        <div className="focus-panel-divider" />
        <div className="focus-today-stat"><strong>{data.newCards}</strong><div><span>New cards</span><small>Added from your course material</small></div></div>
        <div className="focus-today-stat"><strong>{data.reviewMinutes}<em>m</em></strong><div><span>Study time</span><small>At your usual pace</small></div></div>
        <div className="focus-panel-divider" />
        <p className="focus-panel-note"><Sparkles size={16} /> Your next set is ready. No extra cards today.</p>
      </aside>
    </section>
    <section className="focus-subjects"><div className="focus-section-heading"><h2>In your queue</h2><span>{data.due} due</span></div>
      <div className="focus-course-list">{data.courses.map(course => <button className="focus-course-row" type="button" key={course.id} onClick={() => onScreenChange(course.id === 'books' ? 'books' : 'review')}>
        <span className="focus-course-icon" style={{ '--course-color': course.color } as React.CSSProperties}>{course.id === 'books' ? <BookOpen size={20} /> : <LibraryBig size={20} />}</span>
        <span className="focus-course-copy"><strong>{course.name}</strong><small>{course.topic}</small></span><span className="focus-course-due">{course.due} due</span><ChevronRight size={17} className="focus-chevron" />
      </button>)}</div>
    </section>
  </main>;
}

const ratings = [
  { label: 'Again', interval: '1 min', tone: 'again' },
  { label: 'Hard', interval: '8 min', tone: 'hard' },
  { label: 'Mid', interval: '1 day', tone: 'mid' },
  { label: 'Easy', interval: '3 days', tone: 'easy' },
  { label: 'EZ', interval: '6 days', tone: 'ez' },
];

function FocusReview({ onScreenChange }: Pick<DesignProps, 'onScreenChange'>) {
  const [answerShown, setAnswerShown] = useState(true);
  const [rated, setRated] = useState<string | null>(null);
  return <main className="focus-main focus-review">
    <div className="focus-review-head"><button type="button" className="focus-back" onClick={() => onScreenChange('home')}><ArrowLeft size={18} /> Today</button><span>{data.card.progress}</span><button type="button" className="focus-quiet-button" onClick={() => onScreenChange('home')}>Finish later</button></div>
    <div className="focus-review-progress"><span style={{ width: `${13 / data.dailyLimit * 100}%` }} /></div>
    <section className="focus-review-stage" aria-label="Review card">
      <div className="focus-review-context"><span className="focus-card-type">{data.card.type}</span><span>{data.card.course} / {data.card.topic}</span></div>
      <h1>{data.card.question}</h1>
      {answerShown ? <div className="focus-answer"><span>Answer</span><p>{data.card.answer}</p></div> : <button className="focus-reveal" type="button" onClick={() => setAnswerShown(true)}>Show answer <ArrowRight size={18} /></button>}
      <div className="focus-review-source"><BookOpen size={16} /><span>{data.card.source} · {data.card.citation}</span></div>
    </section>
    <section className="focus-grade-area"><div className="focus-grade-title"><span>How well did you remember?</span><button type="button" className="focus-undo" onClick={() => { setRated(null); setAnswerShown(false); }}><RotateCcw size={15} /> Reset preview</button></div>
      <div className="focus-grade-grid">{ratings.map(rating => <button type="button" className={`focus-grade focus-grade-${rating.tone} ${rated === rating.label ? 'is-selected' : ''}`} key={rating.label} onClick={() => setRated(rating.label)} disabled={!answerShown}>
        <strong>{rating.label}</strong><span>{rating.interval}</span>{rated === rating.label && <Check size={16} aria-label="Selected" />}
      </button>)}</div>
      <p className="focus-grade-hint">{rated ? `Marked ${rated} for this preview.` : 'Choose one to schedule the next review.'}</p>
    </section>
  </main>;
}

function FocusBooks({ onScreenChange }: Pick<DesignProps, 'onScreenChange'>) {
  const [page, setPage] = useState<number>(data.book.currentPage);
  return <main className="focus-main focus-books">
    <FocusTop title="Your reading." detail="Books become memories" />
    <div className="focus-books-grid">
      <section className="focus-book-feature"><div className="focus-book-header"><span>Currently reading</span><span className="focus-book-tag"><span className="focus-status-dot" /> In progress</span></div>
        <div className="focus-book-body"><div className="focus-book-cover"><span>ROBERT<br />GREENE</span><strong>Las 48<br />leyes del<br />poder</strong><span className="focus-cover-rule" /></div>
          <div className="focus-book-info"><p className="focus-book-overline">{data.book.author}</p><h2>{data.book.title}</h2><p>Keep your place. New cards draw only from the pages you’ve reached.</p><div className="focus-book-page"><strong>{page}</strong><span>current page<br /><small>Updated {data.book.lastSession.toLowerCase()}</small></span></div></div></div>
      </section>
      <aside className="focus-book-side"><h3>Reading notes</h3><div className="focus-book-stat"><strong>{data.book.highlights}</strong><span>highlights saved</span></div><div className="focus-book-stat"><strong>{data.book.newCards}</strong><span>new cards from this book</span></div><button type="button" onClick={() => onScreenChange('review')}>Review book cards <ArrowRight size={17} /></button></aside>
    </div>
    <section className="focus-page-update"><div><h2>Update your place</h2><p>Cards will cover only pages you’ve finished.</p></div><form onSubmit={event => { event.preventDefault(); const input = event.currentTarget.elements.namedItem('page') as HTMLInputElement; setPage(Math.max(1, Number(input.value) || page)); }}><label htmlFor="focus-page-input">Current page</label><input id="focus-page-input" name="page" type="number" min="1" defaultValue={page} /><button type="submit">Save page</button></form></section>
  </main>;
}

export function Focus(props: DesignProps) {
  return <div className="focus-app"><FocusNav {...props} />{props.screen === 'home' ? <FocusHome onScreenChange={props.onScreenChange} /> : props.screen === 'review' ? <FocusReview onScreenChange={props.onScreenChange} /> : <FocusBooks onScreenChange={props.onScreenChange} />}</div>;
}

export default Focus;
