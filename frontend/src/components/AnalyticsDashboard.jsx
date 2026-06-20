import { TrendingUp, Users, Clock, Zap, Award, BarChart2 } from 'lucide-react';

export default function AnalyticsDashboard({ analytics, clinicState }) {
  if (!analytics) return null;

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const hourlyData = hours.map(h => ({ hour: h, count: analytics.hourlyPatients?.[h] || 0 }));
  const activeHours = hourlyData.filter(h => h.count > 0);
  const maxCount = Math.max(...hourlyData.map(h => h.count), 1);

  const priorityCounts = analytics.priorityCounts || { normal: 0, urgent: 0, elderly: 0 };
  const totalPriority = priorityCounts.normal + priorityCounts.urgent + priorityCounts.elderly;

  const waiting = (clinicState.queue || []).filter(p => p.status === 'waiting');
  const done = (clinicState.queue || []).filter(p => p.status === 'done');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Top Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        <AnalyticCard
          label="Total Today" value={analytics.totalToday || 0}
          icon={<Users size={15} />} color="var(--accent-teal)"
          sub={`${clinicState.totalServed} served`}
        />
        <AnalyticCard
          label="Avg Actual Wait" value={analytics.avgActualWait > 0 ? `${analytics.avgActualWait}m` : 'N/A'}
          icon={<Clock size={15} />} color="var(--accent-blue)"
          sub={`${analytics.waitTimeSamples?.length || 0} samples`}
        />
        <AnalyticCard
          label="Peak Hour" value={analytics.peakHour ? `${analytics.peakHour}:00` : 'N/A'}
          icon={<TrendingUp size={15} />} color="var(--accent-amber)"
          sub={analytics.peakHour ? `${analytics.hourlyPatients?.[analytics.peakHour] || 0} patients` : 'No data'}
        />
      </div>

      {/* Hourly Chart */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <BarChart2 size={15} color="var(--accent-teal)" />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>Patients Per Hour</span>
        </div>

        {activeHours.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '24px 0' }}>
            No patient data yet. Start adding patients to see the chart.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100, marginBottom: 8 }}>
              {activeHours.map(({ hour, count }) => (
                <div key={hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{count}</div>
                  <div
                    style={{
                      width: '100%', borderRadius: '3px 3px 0 0',
                      background: count === maxCount
                        ? 'var(--accent-teal)'
                        : 'var(--accent-teal-dim)',
                      height: `${(count / maxCount) * 80}px`,
                      minHeight: 4, transition: 'all .3s',
                      border: count === maxCount ? 'none' : '1px solid rgba(0,212,170,0.15)'
                    }}
                  />
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', transform: 'rotate(-45deg)', transformOrigin: 'center', marginTop: 4 }}>
                    {hour}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 16 }}>
              Bright bar = peak hour
            </div>
          </>
        )}
      </div>

      {/* Priority Breakdown */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Zap size={15} color="var(--accent-amber)" />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>Priority Breakdown</span>
        </div>

        {totalPriority === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>No data yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Normal', key: 'normal', color: 'var(--accent-blue)' },
              { label: 'Urgent', key: 'urgent', color: 'var(--accent-red)' },
              { label: 'Elderly/Special', key: 'elderly', color: 'var(--accent-purple)' },
            ].map(({ label, key, color }) => {
              const count = priorityCounts[key] || 0;
              const pct = totalPriority > 0 ? Math.round((count / totalPriority) * 100) : 0;
              return (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width .5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Queue Health */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Award size={15} color="var(--accent-green)" />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>Queue Health</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Currently Waiting', value: waiting.length, color: waiting.length > 10 ? 'var(--accent-red)' : waiting.length > 5 ? 'var(--accent-amber)' : 'var(--accent-green)' },
            { label: 'Completed', value: done.length + clinicState.totalServed, color: 'var(--accent-green)' },
            { label: 'Completion Rate', value: analytics.totalToday > 0 ? `${Math.round(((done.length + clinicState.totalServed) / analytics.totalToday) * 100)}%` : 'N/A', color: 'var(--accent-teal)' },
            { label: 'Session Duration', value: formatDuration(analytics.sessionStart), color: 'var(--accent-blue)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnalyticCard({ label, value, icon, color, sub }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color, marginBottom: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}

function formatDuration(start) {
  if (!start) return 'N/A';
  const ms = Date.now() - new Date(start).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
