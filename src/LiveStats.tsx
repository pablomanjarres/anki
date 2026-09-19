import { api } from './api';
import { useResource } from './useResource';
import { Status } from './LiveShared';

export function LiveStats() {
  const { data, error, loading, reload } = useResource(api.stats);
  const max = Math.max(1, ...(data?.dueByDay.map(day => day.count) || []));
  return <div className="live-stats"><div className="pocket-heading"><span>Your rhythm</span><h1>Study in motion.</h1><p>Small sessions add up.</p></div>
    {(!data || error) && <Status loading={loading} error={error} retry={reload} />}
    {data && !error && <><div className="live-stat-grid"><div><strong>{data.reviewedToday}</strong><span>Reviewed today</span></div><div><strong>{data.reviewedThisWeek}</strong><span>This week</span></div><div><strong>{data.streak}</strong><span>Day streak</span></div>{data.retention !== undefined && <div><strong>{Math.round(data.retention <= 1 ? data.retention * 100 : data.retention)}%</strong><span>Retention</span></div>}</div>
      <section className="live-forecast"><div className="pocket-section-head"><h2>Coming due</h2><span>Next 7 days</span></div>{data.dueByDay.length ? <div className="live-bars">{data.dueByDay.map(day => <div className="live-bar" key={day.date}><span>{day.count}</span><div><i style={{ height: `${Math.max(5, day.count / max * 100)}%` }} /></div><small>{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</small></div>)}</div> : <p className="live-empty">No cards scheduled yet.</p>}</section>
    </>}
  </div>;
}
