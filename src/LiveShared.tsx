import type { Card } from './api';

export function Status({ loading, error, retry }: { loading: boolean; error: string; retry: () => void }) {
  if (loading) return <div className="live-status" role="status">Loading your study space…</div>;
  if (error) return <div className="live-status live-error" role="alert"><p>{error}</p><button type="button" onClick={retry}>Try again</button></div>;
  return null;
}

export function Source({ card }: { card: Card }) {
  return <div className="pocket-source live-source"><span className="pocket-source-mark">{card.deckName.slice(0, 2).toUpperCase()}</span>
    <span><strong>{card.deckName}</strong><small>{card.sourceTitle} · {card.sourceLocator}</small></span></div>;
}
