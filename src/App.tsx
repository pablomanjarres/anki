import { useEffect, useState } from 'react';
import { Focus } from './variants/Focus';
import { Pocket } from './variants/Pocket';
import { LiveApp } from './LiveApp';
import { Marginalia } from './variants/Marginalia';
import { Timeline } from './variants/Timeline';
import type { PreviewScreen } from './types';
import './global.css';

type Design = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
const originalOptions: { id: Design; title: string; subtitle: string }[] = [
  { id: 'a', title: 'A · Marginalia', subtitle: 'Reading-inspired' },
  { id: 'b', title: 'B · Focus', subtitle: 'Review-first' },
  { id: 'c', title: 'C · Course Map', subtitle: 'Timeline-led' },
];
const refreshOptions: { id: Design; title: string; subtitle: string }[] = [
  { id: 'd', title: 'D · Noir', subtitle: 'Monochrome + citron' },
  { id: 'e', title: 'E · Index', subtitle: 'Scholarly + oxblood' },
  { id: 'f', title: 'F · Atmosphere', subtitle: 'Soft + violet' },
];
const referenceOptions: { id: Design; title: string; subtitle: string }[] = [
  { id: 'g', title: 'G · Pocket Dark', subtitle: 'Phone-first study flow' },
  { id: 'h', title: 'H · Pocket Light', subtitle: 'Phone-first study flow' },
];

function locationState() {
  const params = new URLSearchParams(window.location.search);
  const rawDesign = params.get('design');
  const rawScreen = params.get('screen');
  return {
    design: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].includes(rawDesign ?? '') ? rawDesign as Design : 'a' as Design,
    screen: rawScreen === 'review' || rawScreen === 'books' ? rawScreen : 'home' as PreviewScreen,
    capture: params.get('capture') === '1',
  };
}

export function App() {
  const [state, setState] = useState(locationState);
  useEffect(() => {
    const sync = () => setState(locationState());
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  function navigate(design: Design, screen: PreviewScreen) {
    const url = new URL(window.location.href);
    url.searchParams.set('design', design);
    url.searchParams.set('screen', screen);
    window.history.pushState({}, '', url);
    setState(locationState());
    window.scrollTo(0, 0);
  }

  if (!new URLSearchParams(window.location.search).has('design')) return <LiveApp />;

  const options = ['g', 'h'].includes(state.design) ? referenceOptions : ['d', 'e', 'f'].includes(state.design) ? refreshOptions : originalOptions;

  return <>
    {!state.capture && <div className="preview-toolbar">
      <div className="preview-toolbar-title"><strong>Anki design previews</strong><span>Example content · Choose a direction</span></div>
      <div className="preview-toolbar-options" role="group" aria-label="Choose a design">
        {options.map(option => <button key={option.id} className={state.design === option.id ? 'is-selected' : ''}
          onClick={() => navigate(option.id, state.screen)} type="button">
          <strong>{option.title}</strong><small>{option.subtitle}</small>
        </button>)}
      </div>
    </div>}
    {state.design === 'a' && <Marginalia screen={state.screen} onScreenChange={screen => navigate('a', screen)} />}
    {state.design === 'b' && <Focus screen={state.screen} onScreenChange={screen => navigate('b', screen)} />}
    {state.design === 'c' && <Timeline screen={state.screen} onScreenChange={screen => navigate('c', screen)} />}
    {state.design === 'd' && <Focus theme="noir" screen={state.screen} onScreenChange={screen => navigate('d', screen)} />}
    {state.design === 'e' && <Focus theme="index" screen={state.screen} onScreenChange={screen => navigate('e', screen)} />}
    {state.design === 'f' && <Focus theme="atmosphere" screen={state.screen} onScreenChange={screen => navigate('f', screen)} />}
    {state.design === 'g' && <Pocket mode="dark" screen={state.screen} onScreenChange={screen => navigate('g', screen)} />}
    {state.design === 'h' && <Pocket mode="light" screen={state.screen} onScreenChange={screen => navigate('h', screen)} />}
  </>;
}
