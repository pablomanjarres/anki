import { ArrowRight, BookOpen, ChevronRight } from 'lucide-react';
import { api } from './api';
import { useResource } from './useResource';
import { Status } from './LiveShared';
import { deriveToday } from './liveTodayModel';
import type { Section } from './LiveApp';

const loadToday = async () => {
  const [dashboard, queue] = await Promise.all([api.dashboard(), api.queue()]);
  return { dashboard, queue };
};

export function LiveToday({ go }: { go: (section: Section) => void }) {
  const { data, error, loading, reload } = useResource(loadToday);
  if (!data || error) return <Status loading={loading} error={error} retry={reload} />;

  const { dashboard, queue } = data;
  const { ready, courses, nextCard, backlogCount } = deriveToday(dashboard, queue);
  const book = dashboard.books[0];
  const progress = Math.min(100, queue.reviewedToday / Math.max(1, queue.dailyLimit) * 100);

  return <div className="soft-live-today">
    <div className="soft-live-stage">
      <div className="soft-live-welcome"><span>{dashboard.date}</span><h1>Make it stick.</h1><p>A few good cards today, a stronger memory tomorrow.</p></div>
      <section className="soft-live-hero" aria-label="Today's study progress">
        <div className="soft-live-hero-top"><span>Today’s run</span><span>{queue.reviewedToday} / {queue.dailyLimit} done</span></div>
        <div className="soft-live-hero-count"><strong>{ready}</strong><span>{ready === 1 ? 'card ready' : 'cards ready'}</span></div>
        <img className="soft-live-cloud" src="/design/cloud.webp" alt="Smiling lavender cloud" />
        <img className="soft-live-star" src="/design/star.webp" alt="" aria-hidden="true" />
        <button className="soft-live-hero-action" type="button" onClick={() => go(nextCard ? 'review' : 'cards')}>
          <span>{nextCard ? 'Continue reviewing' : queue.reviewedToday >= queue.dailyLimit ? 'Browse your cards' : 'See your cards'}</span><ArrowRight size={20} />
        </button>
      </section>
      <svg className="soft-live-stage-wave" viewBox="0 0 393 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 38C64 11 96 46 151 45C229 43 232 12 296 18C336 22 361 40 393 30V60H0Z" /></svg>
    </div>
    <div className="soft-live-ribbon" aria-label={`${queue.reviewedToday} of ${queue.dailyLimit} cards completed today`}>
      <span>{queue.reviewedToday} done</span><span className="soft-live-ribbon-track"><i style={{ width: `${progress}%` }} /></span><span>{queue.dailyLimit} max</span>
    </div>
    <section className="soft-live-courses" aria-labelledby="soft-live-due-title">
      <div className="soft-live-section-heading"><h2 id="soft-live-due-title">Ready today</h2><span>Due cards first</span></div>
      {courses.length ? courses.map((course, index) => <button type="button" className="soft-live-course-row" key={course.id} onClick={() => go('review')}>
        <span className={`soft-live-course-symbol soft-live-course-symbol-${index % 2}`}>{course.name.slice(0, 1).toUpperCase()}</span>
        <span className="soft-live-course-copy"><strong>{course.name}</strong><small>{course.dueCount} {course.dueCount === 1 ? 'card' : 'cards'} ready</small></span>
        <b>{course.dueCount}</b><ChevronRight size={18} />
      </button>) : <p className="soft-live-no-due">{nextCard ? 'Your next card is ready in Review.' : 'No course cards are ready right now.'}</p>}
      {backlogCount > 0 && <p className="soft-live-backlog">{backlogCount} overdue {backlogCount === 1 ? 'card remains' : 'cards remain'} in your backlog.</p>}
    </section>
    {book && <button className="soft-live-reading" type="button" onClick={() => go('books')}>
      <span className="soft-live-reading-icon"><BookOpen size={22} /></span>
      <span><strong>Keep your place</strong><small>{book.title} · {book.currentPage ? `p. ${book.currentPage}` : book.location ? `location ${book.location}` : 'Save your checkpoint'}</small></span>
      <ArrowRight size={19} />
    </button>}
  </div>;
}
