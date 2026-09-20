import { api } from './api';
import { useResource } from './useResource';
import { Status } from './LiveShared';

export function LiveStats() {
  const { data, error, loading, reload } = useResource(api.stats);
  const max = Math.max(1, ...(data?.dueByDay.map(day => day.count) || []));
  return <div className="live-stats"><section className="live-stats-scene" aria-labelledby="stats-title"><div className="live-stats-intro"><span>Your rhythm</span><h1 id="stats-title">A little, every day.</h1><p>See how your reviews are adding up.</p></div>
    {data && !error && <div className="live-stats-today"><strong>{data.reviewedToday}</strong><span>cards reviewed<br />today</span></div>}
    <svg className="live-stats-wave" viewBox="0 0 1200 80" preserveAspectRatio="none" aria-hidden="true"><path d="M0 25 C240 75 335 5 525 29 S965 76 1200 21 V80 H0Z" /></svg></section>
    {(!data || error) && <Status loading={loading} error={error} retry={reload} />}
    {data && !error && <><div className="live-stat-grid"><div><strong>{data.reviewedThisWeek}</strong><span>This week</span></div><div><strong>{data.streak}</strong><span>Day streak</span></div>{data.retention !== undefined && <div><strong>{Math.round(data.retention <= 1 ? data.retention * 100 : data.retention)}%</strong><span>Retention</span></div>}</div>
      <section className="live-forecast"><div className="pocket-section-head"><h2>Coming due</h2><span>Next 7 days</span></div>{data.dueByDay.length ? <div className="live-bars" role="list" aria-label="Cards coming due over the next seven days">{data.dueByDay.map(day => <div className="live-bar" role="listitem" aria-label={`${day.count} cards due on ${day.date}`} key={day.date}><span>{day.count}</span><div><i style={{ height: day.count ? `${Math.max(5, day.count / max * 100)}%` : '0%' }} /></div><small>{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</small></div>)}</div> : <p className="live-empty">No cards scheduled yet.</p>}</section>
    </>}
  </div>;
}
