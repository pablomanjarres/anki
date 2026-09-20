import { useState } from 'react';
import { BookOpen, ChartNoAxesCombined, House, Layers3, LibraryBig, Plus, X } from 'lucide-react';
import { LiveToday } from './LiveToday';
import { LiveReview } from './LiveReview';
import { LiveCards } from './LiveCards';
import { LiveBooks } from './LiveBooks';
import { LiveStats } from './LiveStats';
import './variants/Pocket.css';
import './variants/Pocket.mobile.css';
import './Live.css';
import './Live.mobile.css';
import './SoftLive.css';
import './SoftReview.css';
import './LiveBooksSoft.css';
import './LiveLibrarySoft.css';
import './SoftLive.mobile.css';

export type Section = 'today' | 'review' | 'cards' | 'books' | 'stats';
const tabs = [
  { id: 'today', label: 'Today', icon: House },
  { id: 'review', label: 'Review', icon: Layers3 },
  { id: 'cards', label: 'Cards', icon: LibraryBig },
  { id: 'books', label: 'Books', icon: BookOpen },
  { id: 'stats', label: 'Stats', icon: ChartNoAxesCombined },
] as const;

function Navigation({ section, go }: { section: Section; go: (section: Section) => void }) {
  return <nav className="soft-live-nav" aria-label="Main navigation">
    <svg className="soft-live-nav-wave" viewBox="0 0 393 54" preserveAspectRatio="none" aria-hidden="true"><path d="M0 53V34C57 34 72 41 107 33C150 22 154 2 198 2C242 2 250 29 294 35C330 40 354 29 393 35V54Z" /></svg>
    {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => go(id)}
      className={section === id ? 'is-current' : ''} aria-current={section === id ? 'page' : undefined}>
      <Icon size={21} strokeWidth={1.8} /><span>{label}</span>
    </button>)}
  </nav>;
}

export function LiveApp() {
  const [section, setSection] = useState<Section>('today');
  const [refresh, setRefresh] = useState(0);
  function go(next: Section) {
    setSection(next);
    if (next === 'today') setRefresh(value => value + 1);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  return <div className={`pocket-app live-app soft-live ${section === 'review' ? 'is-reviewing' : ''}`}>
    <div className="pocket-shell soft-live-shell">
      <header className="soft-live-header">
        <button className="soft-live-brand" type="button" onClick={() => go('today')} aria-label="Anki home">
          <span className="soft-live-brand-mark"><Layers3 size={19} strokeWidth={2.3} /></span><strong>anki</strong>
        </button>
        {section === 'review' ? <button className="soft-live-header-action soft-live-close" type="button" onClick={() => go('today')} aria-label="Finish review"><X size={20} /></button>
          : <button className="soft-live-header-action" type="button" onClick={() => go('cards')} aria-label="Create a card"><Plus size={22} /></button>}
      </header>
      <main className="soft-live-main" key={section === 'today' ? refresh : section}>
        {section === 'today' && <LiveToday go={go} />}
        {section === 'review' && <LiveReview />}
        {section === 'cards' && <LiveCards />}
        {section === 'books' && <LiveBooks />}
        {section === 'stats' && <LiveStats />}
      </main>
      {section !== 'review' && <Navigation section={section} go={go} />}
    </div>
  </div>;
}
