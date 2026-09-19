import { ArrowRight, BookOpen, ChevronRight } from 'lucide-react';
import { api } from './api';
import { useResource } from './useResource';
import { Status } from './LiveShared';
import type { Section } from './LiveApp';

export function LiveToday({ go }: { go: (section: Section) => void }) {
  const { data, error, loading, reload } = useResource(api.dashboard);
  if (!data || error) return <Status loading={loading} error={error} retry={reload} />;

  const ready = data.dueCount + data.newCount;
  const courses = data.courses.filter(course => course.dueCount > 0);
  const book = data.books[0];
  const date = new Date(`${data.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const progress = Math.min(100, data.reviewedToday / Math.max(1, data.dailyLimit) * 100);

  return <div className="soft-live-today">
    <div className="soft-live-stage">
      <div className="soft-live-welcome"><span>{date}</span><h1>Make it stick.</h1><p>A few good cards today, a stronger memory tomorrow.</p></div>
      <section className="soft-live-hero" aria-label="Today's study progress">
        <div className="soft-live-hero-top"><span>Today’s run</span><span>{data.reviewedToday} / {data.dailyLimit} done</span></div>
        <div className="soft-live-hero-count"><strong>{ready}</strong><span>{ready === 1 ? 'card ready' : 'cards ready'}</span></div>
        <img className="soft-live-dragon" src="/design/study-dragon-v2.webp" alt="Illustrated dragon holding a flashcard" />
        <button className="soft-live-hero-action" type="button" onClick={() => go(data.nextCard ? 'review' : 'cards')}>
          <span>{data.nextCard ? 'Continue reviewing' : data.reviewedToday >= data.dailyLimit ? 'Browse your cards' : 'See your cards'}</span><ArrowRight size={20} />
        </button>
      </section>
      <svg className="soft-live-stage-wave" viewBox="0 0 393 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 38C64 11 96 46 151 45C229 43 232 12 296 18C336 22 361 40 393 30V60H0Z" /></svg>
    </div>
    <div className="soft-live-ribbon" aria-label={`${data.reviewedToday} of ${data.dailyLimit} cards completed today`}>
      <span>{data.reviewedToday} done</span><span className="soft-live-ribbon-track"><i style={{ width: `${progress}%` }} /></span><span>{data.dailyLimit} max</span>
    </div>
    <section className="soft-live-courses" aria-labelledby="soft-live-due-title">
      <div className="soft-live-section-heading"><h2 id="soft-live-due-title">Due today</h2><span>Old cards first</span></div>
      {courses.length ? courses.map((course, index) => <button type="button" className="soft-live-course-row" key={course.id} onClick={() => go('review')}>
        <span className={`soft-live-course-symbol soft-live-course-symbol-${index % 2}`}>{course.name.slice(0, 1).toUpperCase()}</span>
        <span className="soft-live-course-copy"><strong>{course.name}</strong><small>{course.dueCount} {course.dueCount === 1 ? 'card' : 'cards'} ready</small></span>
        <b>{course.dueCount}</b><ChevronRight size={18} />
      </button>) : <p className="soft-live-no-due">{data.nextCard ? 'Your next card is ready in Review.' : 'No course cards are due right now.'}</p>}
      {data.backlogCount > 0 && <p className="soft-live-backlog">{data.backlogCount} overdue {data.backlogCount === 1 ? 'card remains' : 'cards remain'} in your backlog.</p>}
    </section>
    {book && <button className="soft-live-reading" type="button" onClick={() => go('books')}>
      <span className="soft-live-reading-icon"><BookOpen size={22} /></span>
      <span><strong>Keep your place</strong><small>{book.title} · {book.currentPage ? `p. ${book.currentPage}` : book.location ? `location ${book.location}` : 'Save your checkpoint'}</small></span>
      <ArrowRight size={19} />
    </button>}
  </div>;
}
