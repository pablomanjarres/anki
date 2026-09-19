import { useState } from 'react';
import { BookOpen, ChartNoAxesCombined, ChevronRight, Layers3, LibraryBig, Plus, Sparkles } from 'lucide-react';
import { api, type Dashboard } from './api';
import { useResource } from './useResource';
import { Source, Status } from './LiveShared';
import { LiveReview } from './LiveReview';
import { LiveCards } from './LiveCards';
import { LiveBooks } from './LiveBooks';
import { LiveStats } from './LiveStats';
import './variants/Pocket.css';
import './variants/Pocket.mobile.css';
import './Live.css';
import './Live.mobile.css';

type Section = 'today' | 'review' | 'cards' | 'books' | 'stats';
const tabs = [
  { id: 'today', label: 'Today', icon: Sparkles },
  { id: 'review', label: 'Review', icon: Layers3 },
  { id: 'cards', label: 'Cards', icon: LibraryBig },
  { id: 'books', label: 'Books', icon: BookOpen },
  { id: 'stats', label: 'Stats', icon: ChartNoAxesCombined },
] as const;

function Today({ go }: { go: (section: Section) => void }) {
  const { data, error, loading, reload } = useResource(api.dashboard);
  if (!data || error) return <Status loading={loading} error={error} retry={reload} />;
  const readyCourses = data.courses.filter(course => course.dueCount > 0);
  return <div className="pocket-home live-today">
    <div className="pocket-heading"><span>{data.date}</span><h1>{data.nextCard ? 'Ready for a quick round?' : data.reviewedToday >= data.dailyLimit ? "Today's round is complete." : 'All caught up for now.'}</h1><p>{data.nextCard ? data.reviewedToday ? 'Pick up where you left off.' : 'Your next card is waiting.' : 'New cards appear when you have eligible material.'}</p></div>
    <NextCard data={data} go={go} />
    <div className="pocket-side"><section className="pocket-progress" aria-label="Daily progress">
      <div><strong>{data.reviewedToday} <span>of {data.dailyLimit}</span></strong><span>cards today</span></div>
      <div className="pocket-progress-track"><span style={{ width: `${Math.min(100, data.reviewedToday / Math.max(1, data.dailyLimit) * 100)}%` }} /></div>
      <p>{data.dueCount} due now <span>·</span> {data.newCount} new waiting</p>
    </section>{data.books[0] && <button className="pocket-reading" type="button" onClick={() => go('books')}>
      <span className="pocket-book-glyph"><BookOpen size={23} /></span><span className="pocket-reading-copy"><small>Continue reading</small><strong>{data.books[0].title}</strong><span>{data.books[0].currentPage ? `Page ${data.books[0].currentPage}` : 'Add your reading checkpoint'}</span></span><ChevronRight size={20} />
    </button>}</div>
    <section className="pocket-queue"><div className="pocket-section-head"><h2>Coming up</h2><span>{data.dueCount + data.newCount} ready</span></div>
      {readyCourses.length ? <div className="pocket-course-list">{readyCourses.map(course => <button className="pocket-course" type="button" key={course.id} onClick={() => go('review')}>
        <span className="pocket-course-dot" /><span className="pocket-course-copy"><strong>{course.name}</strong><small>{course.dueCount} cards ready</small></span><span className="pocket-due">{course.dueCount}</span><ChevronRight size={18} />
      </button>)}</div> : <div className="live-empty">No cards ready. New cards appear when eligible material is available.</div>}
      {data.backlogCount > 0 && <p className="live-backlog">{data.backlogCount} overdue cards remain in your backlog.</p>}
    </section>
  </div>;
}

function NextCard({ data, go }: { data: Dashboard; go: (section: Section) => void }) {
  const card = data.nextCard;
  return <section className="pocket-next"><div className="pocket-next-top"><span>{card ? 'Up next' : 'All caught up'}</span><span className="pocket-step">{data.reviewedToday} / {data.dailyLimit}</span></div>
    {card ? <><Source card={card} /><h2>{card.question}</h2><button className="pocket-primary" type="button" onClick={() => go('review')}>Start reviewing <ChevronRight size={20} /></button></>
      : <><h2>{data.reviewedToday >= data.dailyLimit ? 'You reached your daily limit.' : 'Nothing due right now.'}</h2><p className="live-next-note">{data.backlogCount ? `${data.backlogCount} overdue cards are still in your backlog.` : 'Come back for the next round.'}</p><button className="pocket-primary" type="button" onClick={() => go('cards')}>Browse cards <ChevronRight size={20} /></button></>}
  </section>;
}

export function LiveApp() {
  const [section, setSection] = useState<Section>('today');
  const [refresh, setRefresh] = useState(0);
  function go(next: Section) { setSection(next); if (next === 'today') setRefresh(value => value + 1); window.scrollTo({ top: 0, behavior: 'instant' }); }
  return <div className="pocket-app pocket-dark live-app"><div className="pocket-shell"><header className="pocket-header">
    <button className="pocket-brand" type="button" onClick={() => go('today')} aria-label="Anki home"><span className="pocket-logo"><Layers3 size={20} /></span><strong>anki</strong></button>
    <nav className="pocket-nav live-nav" aria-label="Main navigation">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => go(id)} className={section === id ? 'active' : ''} aria-current={section === id ? 'page' : undefined}><Icon size={19} strokeWidth={1.9} /><span>{label}</span></button>)}</nav>
    <button className="live-header-add" type="button" onClick={() => go('cards')} aria-label="Create a card"><Plus size={21} /></button>
  </header><main key={section === 'today' ? refresh : section}>
    {section === 'today' && <Today go={go} />}
    {section === 'review' && <LiveReview />}
    {section === 'cards' && <LiveCards />}
    {section === 'books' && <LiveBooks />}
    {section === 'stats' && <LiveStats />}
  </main></div></div>;
}
