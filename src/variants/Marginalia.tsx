import { useState } from 'react';
import { ArrowRight, BookOpen, Check, Home, Layers3, RotateCcw, Sparkles } from 'lucide-react';
import { previewData as data } from '../data';
import type { DesignProps, PreviewScreen } from '../types';
import './Marginalia.css';
import './Marginalia.mobile.css';

const nav: { screen: PreviewScreen; label: string; icon: typeof Home }[] = [
  { screen: 'home', label: 'Today', icon: Home },
  { screen: 'review', label: 'Review', icon: Layers3 },
  { screen: 'books', label: 'Books', icon: BookOpen },
];

function Navigation({ screen, onScreenChange }: DesignProps) {
  return <nav className="marginalia-nav" aria-label="Main navigation">
    {nav.map(({ screen: next, label, icon: Icon }) => <button key={next}
      className={screen === next ? 'is-active' : ''}
      onClick={() => onScreenChange(next)} type="button">
      <Icon size={19} strokeWidth={1.7} /><span>{label}</span>
    </button>)}
  </nav>;
}

function CourseRows() {
  return <div className="marginalia-course-list">
    {data.courses.map((course, index) => <div className="marginalia-course" key={course.id}>
      <span className="marginalia-course-index">0{index + 1}</span>
      <span className="marginalia-course-mark" style={{ backgroundColor: course.color }} />
      <div><strong>{course.name}</strong><small>{course.topic}</small></div>
      <span className="marginalia-course-due">{course.due} due</span>
    </div>)}
  </div>;
}

function HomeScreen({ onScreenChange }: Pick<DesignProps, 'onScreenChange'>) {
  return <>
    <header className="marginalia-heading">
      <span className="marginalia-date">{data.date}</span>
      <h1>Keep the thread.</h1>
      <p>A small session now makes the next one easier.</p>
    </header>
    <section className="marginalia-progress" aria-label="Today's progress">
      <div className="marginalia-progress-top"><span>Today’s pages of memory</span>
        <strong>{data.completed}<em> / {data.dailyLimit}</em></strong></div>
      <div className="marginalia-progress-track"><span style={{ width: `${data.completed / data.dailyLimit * 100}%` }} /></div>
      <div className="marginalia-progress-bottom"><span>{data.due} due today</span><span>{data.newCards} new when ready</span></div>
    </section>
    <section className="marginalia-start">
      <div className="marginalia-start-copy"><span className="marginalia-kicker">Next card</span>
        <h2>{data.card.topic}</h2><p>{data.card.course} <span>•</span> {data.card.source}</p></div>
      <button type="button" onClick={() => onScreenChange('review')} aria-label="Start review">
        <ArrowRight size={23} strokeWidth={1.7} />
      </button>
    </section>
    <div className="marginalia-section-title"><h2>Your shelves</h2><span>Due today</span></div>
    <CourseRows />
  </>;
}

function ReviewScreen() {
  const [revealed, setRevealed] = useState(false);
  const [rated, setRated] = useState<string | null>(null);
  const grades = ['Again', 'Hard', 'Mid', 'Easy', 'EZ'];
  return <>
    <header className="marginalia-review-header"><span className="marginalia-date">A quiet minute to recall</span>
      <div><h1>Review</h1><span>{data.card.progress}</span></div>
      <div className="marginalia-progress-track"><span style={{ width: '43%' }} /></div>
    </header>
    <article className="marginalia-flashcard">
      <div className="marginalia-card-head"><span>{data.card.course} / {data.card.topic}</span>
        <span>{data.card.type}</span></div>
      <div className="marginalia-card-body"><span className="marginalia-kicker">Question</span>
        <h2>{data.card.question}</h2>
        {revealed && <div className="marginalia-answer"><span className="marginalia-kicker">Answer</span>
          <p>{data.card.answer}</p></div>}</div>
      <footer><span>{data.card.source} · {data.card.citation}</span><Sparkles size={17} strokeWidth={1.6} /></footer>
    </article>
    {!revealed ? <button className="marginalia-reveal" onClick={() => setRevealed(true)} type="button">Show answer <ArrowRight size={18} /></button>
      : <div className="marginalia-grading"><p>How well did you recall it?</p><div>
        {grades.map((grade, index) => <button key={grade} type="button"
          className={rated === grade ? 'is-rated' : ''} onClick={() => setRated(grade)}>
          <span>{grade}</span><small>{index + 1}</small></button>)}</div>
        {rated && <p className="marginalia-rated"><Check size={15} /> Rated {rated} in this preview</p>}
      </div>}
    <button className="marginalia-reset" onClick={() => { setRevealed(false); setRated(null); }} type="button"><RotateCcw size={15} /> Reset preview card</button>
  </>;
}

function BooksScreen({ onScreenChange }: Pick<DesignProps, 'onScreenChange'>) {
  const [page, setPage] = useState<number>(data.book.currentPage);
  return <>
    <header className="marginalia-heading"><span className="marginalia-date">Your reading shelf</span>
      <h1>Read it. Keep it.</h1><p>Only pages you have reached become cards.</p></header>
    <article className="marginalia-book">
      <div className="marginalia-book-cover"><span>ROBERT<br />GREENE</span><strong>Las 48<br />leyes del<br />poder</strong><span>Reading now</span></div>
      <div className="marginalia-book-info"><span className="marginalia-kicker">Current book</span>
        <h2>{data.book.title}</h2><p>Robert Greene</p>
        <div className="marginalia-page-rule"><span>01</span><i /><strong>{String(page).padStart(3, '0')}</strong></div>
        <label htmlFor="marginalia-page">You have read through page</label>
        <input id="marginalia-page" type="number" min="1" value={page}
          onChange={event => setPage(Number(event.target.value))} />
        <small>Example reading progress for this design preview</small>
      </div>
    </article>
    <div className="marginalia-book-notes"><div><strong>{data.book.highlights}</strong><span>Highlights saved</span></div>
      <div><strong>{data.book.newCards}</strong><span>Cards from this book</span></div></div>
    <button className="marginalia-book-action" type="button" onClick={() => onScreenChange('review')}>Review book cards <ArrowRight size={18} /></button>
  </>;
}

export function Marginalia({ screen, onScreenChange }: DesignProps) {
  return <div className="marginalia-app">
    <aside className="marginalia-sidebar"><div className="marginalia-brand">anki<span> / </span><em>cortex</em></div>
      <Navigation screen={screen} onScreenChange={onScreenChange} />
      <div className="marginalia-sidebar-note"><span className="marginalia-kicker">A daily practice</span>
        <p>Remember what matters, one card at a time.</p><span>{data.streak} day streak</span></div></aside>
    <main className="marginalia-main">
      {screen === 'home' && <HomeScreen onScreenChange={onScreenChange} />}
      {screen === 'review' && <ReviewScreen />}
      {screen === 'books' && <BooksScreen onScreenChange={onScreenChange} />}
    </main>
    <aside className="marginalia-right"><div className="marginalia-right-top"><span>Saturday</span><strong>19</strong><span>September 2026</span></div>
      <div className="marginalia-right-book"><BookOpen size={21} strokeWidth={1.4} /><span className="marginalia-kicker">Your place</span>
        <h3>{data.book.title}</h3><p>Page {data.book.currentPage} · {data.book.highlights} highlights</p>
        <button type="button" onClick={() => onScreenChange('books')}>Open shelf <ArrowRight size={16} /></button></div>
      <p className="marginalia-right-bottom">Good recall begins with a good question.</p></aside>
    <div className="marginalia-mobile-nav"><Navigation screen={screen} onScreenChange={onScreenChange} /></div>
  </div>;
}
