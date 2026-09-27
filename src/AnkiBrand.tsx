type AnkiBrandProps = { symbolOnly?: boolean; className?: string };

export function AnkiBrand({ symbolOnly = false, className = '' }: AnkiBrandProps) {
  return <img className={`anki-brand ${className}`} src={`/brand/anki-${symbolOnly ? 'symbol' : 'logo'}.svg`}
    width={symbolOnly ? 412 : 1398} height={symbolOnly ? 405 : 320} alt="" aria-hidden="true" />;
}
