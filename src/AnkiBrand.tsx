import './AnkiBrand.css';

type AnkiBrandProps = { symbolOnly?: boolean; className?: string; surface?: boolean; decorative?: boolean };

export function AnkiBrand({ symbolOnly = false, className = '', surface = false, decorative = true }: AnkiBrandProps) {
  return <img className={`anki-brand ${surface ? 'anki-brand-surface' : ''} ${className}`} src={`/brand/anki-${symbolOnly ? 'symbol.svg?v=geometric-1' : 'logo.svg?v=type-b-1'}`}
    width={symbolOnly ? 412 : 445.904} height={symbolOnly ? 405 : 120} alt={decorative ? '' : 'Anki'} aria-hidden={decorative || undefined} />;
}

export function AnkiPreviewHeader() {
  return <header className="anki-preview-header"><AnkiBrand surface decorative={false} /></header>;
}
