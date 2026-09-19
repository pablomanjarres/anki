import { useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Clock3, Layers3, LibraryBig, RotateCcw, Sparkles } from 'lucide-react';
import type { DesignProps, PreviewScreen } from '../types';
import { previewData } from '../data';
import './Timeline.css';

const navigation: { id: PreviewScreen; label: string; icon: typeof Layers3 }[] = [
  { id: 'home', label: 'Timeline', icon: Layers3 },
  { id: 'review', label: 'Review', icon: RotateCcw },
  { id: 'books', label: 'Books', icon: LibraryBig },
];

function Navigation({ screen, onScreenChange }: DesignProps) {
  return <nav className="tl-nav" aria-label="Study sections">
    {navigation.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={screen === id ? 'tl-nav-item is-current' : 'tl-nav-item'} aria-current={screen === id ? 'page' : undefined} onClick={() => onScreenChange(id)}>
      <Icon size={19} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span>
    </button>)}
  </nav>;
}

function DailyRail({ screen }: { screen: PreviewScreen }) {
  return <aside className="tl-rail">
    <div className="tl-brand"><span className="tl-brand-mark" aria-hidden="true"><span /><span /><span /></span><span>anki<span className="tl-brand-period">.</span></span></div>
    <p className="tl-rail-caption">Your study record</p>
    <div className="tl-rail-date"><span>19</span><div>September<br /><strong>Saturday</strong></div></div>
    <div className="tl-rail-rule" />
    <div className="tl-rail-caption">Today’s pace</div>
    <div className="tl-rail-total"><strong>{previewData.completed}</strong><span>of {previewData.dailyLimit}<br />cards reviewed</span></div>
    <div className="tl-ticks" aria-label={`${previewData.completed} of ${previewData.dailyLimit} cards reviewed`}>
      {Array.from({ length: previewData.dailyLimit }, (_, i) => <span key={i} className={i < previewData.completed ? 'is-done' : ''} />)}
    </div>
    <p className="tl-rail-note"><Clock3 size={14} aria-hidden="true" /> About {previewData.reviewMinutes} minutes left</p>
    <div className="tl-rail-bottom"><span className="tl-rail-orbit" aria-hidden="true">✦</span><span>{screen === 'books' ? 'Keep your place.' : 'Keep what matters.'}</span></div>
  </aside>;
}

function SectionHead({ index, label, title, aside }: { index: string; label: string; title: string; aside?: string }) {
  return <header className="tl-section-head"><div className="tl-section-index">{index}<span className="tl-index-line" /></div><div><p className="tl-kicker">{label}</p><h1>{title}</h1></div>{aside && <span className="tl-head-aside">{aside}</span>}</header>;
}

function Home({ onScreenChange }: { onScreenChange: DesignProps['onScreenChange'] }) {
  return <>
    <SectionHead index="01" label="Saturday, September 19" title="Your learning, in time." aside="6 day streak" />
    <div className="tl-home-grid">
      <div className="tl-main-column">
        <div className="tl-feature"><div className="tl-feature-top"><span><Sparkles size={15} /> Today’s review</span><span>12 / 30 complete</span></div><div className="tl-feature-inner"><h2>Pick up where you left off.</h2><p>{previewData.due} cards are ready. Your course material and reading have been brought together in one queue.</p><button type="button" className="tl-primary" onClick={() => onScreenChange('review')}>Continue review <ArrowRight size={18} /></button></div><div className="tl-feature-track"><span /></div></div>
        <div className="tl-list-heading"><h2>On your timeline</h2><span>What you can review now</span></div>
        <div className="tl-timeline-list">
          {previewData.courses.map((course, index) => <button type="button" className="tl-event" key={course.id} onClick={() => onScreenChange(course.id === 'books' ? 'books' : 'review')}>
            <span className="tl-event-axis"><span className="tl-event-node" style={{ '--course-color': course.color } as React.CSSProperties} /></span>
            <span className="tl-event-time">{index === 0 ? 'NOW' : index === 1 ? 'THIS WEEK' : 'READING'}</span>
            <span className="tl-event-detail"><strong>{course.name}</strong><span>{course.topic}<small>{course.source}</small></span></span>
            <span className="tl-event-count">{course.due} <span>cards</span></span><ChevronRight size={18} className="tl-event-arrow" aria-hidden="true" />
          </button>)}
        </div>
      </div>
      <aside className="tl-side-column"><div className="tl-side-label">From your sources</div><div className="tl-side-illustration"><span className="tl-side-ring" /><span className="tl-side-ring" /><span className="tl-side-ring" /><BookOpen size={34} strokeWidth={1.2} /></div><h3>Today, then tomorrow.</h3><p>New cards follow what you have covered in class and how far you have read. The daily review stays within 30 cards.</p><div className="tl-side-divider" /><div className="tl-side-stat"><span>New today</span><strong>05</strong></div><div className="tl-side-stat"><span>Still due</span><strong>18</strong></div></aside>
    </div>
  </>;
}

const grades = [
  { label: 'Again', time: 'Soon' }, { label: 'Hard', time: '1 day' }, { label: 'Mid', time: '3 days' }, { label: 'Easy', time: '6 days' }, { label: 'EZ', time: '12 days' },
];

function Review() {
  const [revealed, setRevealed] = useState(false);
  const [graded, setGraded] = useState<string | null>(null);
  return <>
    <SectionHead index="02" label="Review session" title="One thought at a time." aside="13 of 30" />
    <div className="tl-review-layout"><div className="tl-review-axis"><div className="tl-review-stamp">19<span>SEP</span></div><div className="tl-review-axis-line"><span /></div><p>Next along<br />your timeline</p></div>
      <div className="tl-review-body"><div className="tl-review-meta"><span className="tl-course-dot" />{previewData.card.course}<span className="tl-meta-divider" />{previewData.card.topic}<span className="tl-review-type">{previewData.card.type}</span></div>
        <div className="tl-question"><span className="tl-question-label">Question</span><h2>{previewData.card.question}</h2></div>
        {graded ? <div className="tl-answer tl-graded" role="status"><Check size={20} /><div><strong>Marked {graded}</strong><span>Review saved. Your next card is ready.</span></div></div> : revealed ? <div className="tl-answer"><span className="tl-question-label">Answer</span><p>{previewData.card.answer}</p></div> : <button type="button" className="tl-reveal" onClick={() => setRevealed(true)}>Reveal answer <ArrowRight size={18} /></button>}
        <div className="tl-review-foot"><span>From {previewData.card.source}<br /><strong>{previewData.card.citation}</strong></span><span className="tl-source-icon"><BookOpen size={18} aria-hidden="true" /></span></div>
        {revealed && !graded && <div className="tl-grade-row" aria-label="Rate recall">{grades.map(({ label, time }) => <button type="button" key={label} onClick={() => setGraded(label)}><strong>{label}</strong><span>{time}</span></button>)}</div>}
        {graded && <button className="tl-next-card" type="button" onClick={() => { setGraded(null); setRevealed(false); }}>Next card <ArrowRight size={17} /></button>}
      </div>
      <aside className="tl-review-progress"><span>Session</span><strong>13<span>/ 30</span></strong><div className="tl-vertical-meter"><span /></div><p>Each card you recall makes tomorrow a little lighter.</p></aside>
    </div>
  </>;
}

function Books() {
  const { book } = previewData;
  const [page, setPage] = useState<number>(book.currentPage);
  const [saved, setSaved] = useState(false);
  return <>
    <SectionHead index="03" label="Reading record" title="Keep your place." aside="1 book in progress" />
    <div className="tl-book-layout"><div className="tl-book-visual"><div className="tl-book-cover"><span className="tl-cover-top">Robert Greene</span><span className="tl-cover-line" /><strong>Las 48<br />leyes del<br />poder</strong><span className="tl-cover-bottom">Reading notes</span></div><span className="tl-book-shadow" /></div>
      <div className="tl-book-content"><p className="tl-kicker">Current book</p><h2>{book.title}</h2><p className="tl-book-author">by {book.author}</p><div className="tl-book-rule" /><div className="tl-page-number"><span>Reading through page</span><strong>{page}<small> / 480</small></strong></div><div className="tl-book-progress" role="progressbar" aria-valuenow={page} aria-valuemin={0} aria-valuemax={480} aria-label="Pages read"><span style={{ width: `${Math.min(100, page / 480 * 100)}%` }} /></div><div className="tl-book-chapters"><span>Beginning</span><span>End of book</span></div>
        <div className="tl-page-update"><label htmlFor="tl-page-input">Update your page</label><div><input id="tl-page-input" inputMode="numeric" type="number" min="1" max="480" value={page} onChange={event => { setPage(Number(event.target.value)); setSaved(false); }} /><button type="button" onClick={() => setSaved(true)}>Save place <ArrowRight size={17} /></button></div>{saved && <p role="status" className="tl-saved">Reading place saved in this preview.</p>}</div>
      </div>
      <aside className="tl-book-notes"><BookOpen size={22} strokeWidth={1.4} /><span>Reading becomes recall</span><div className="tl-note-stat"><strong>{book.highlights}</strong><span>highlights collected</span></div><div className="tl-note-stat"><strong>{book.newCards}</strong><span>new cards today</span></div><p>Cards come only from pages you have reached and notes you have made.</p></aside>
    </div>
  </>;
}

export function Timeline({ screen, onScreenChange }: DesignProps) {
  return <div className="tl-app"><DailyRail screen={screen} /><div className="tl-content"><header className="tl-topbar"><div className="tl-mobile-brand"><span className="tl-brand-mark" aria-hidden="true"><span /><span /><span /></span>anki<span className="tl-brand-period">.</span></div><span>Course timeline / {screen === 'home' ? 'Today' : screen === 'review' ? 'Review' : 'Books'}</span><span className="tl-topbar-right">Saturday, September 19 <span className="tl-avatar">P</span></span></header><Navigation screen={screen} onScreenChange={onScreenChange} /><main className="tl-main">{screen === 'home' ? <Home onScreenChange={onScreenChange} /> : screen === 'review' ? <Review /> : <Books />}</main></div></div>;
}

export default Timeline;
