import React, { useEffect, useState } from 'react';
import { getAdminFunnel } from '../services/api';
import { TrendingUp } from 'lucide-react';

const STAGES = [
  { key: 'signups', label: 'Companies signed up' },
  { key: 'withSite', label: 'Created a site' },
  { key: 'withWorkers', label: 'Added workers' },
  { key: 'withDailyReport', label: 'Filed a daily report' },
  { key: 'paying', label: 'Paying customers' },
];

const ActivationFunnel = () => {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setError('');
    getAdminFunnel(days)
      .then((res) => {
        if (alive && res.success) setData(res);
      })
      .catch(() => {
        if (alive) setError('Funnel data could not be loaded.');
      });
    return () => {
      alive = false;
    };
  }, [days]);

  if (error) return <div style={styles.error}>{error}</div>;
  if (!data) return <div style={styles.muted}>Loading activation funnel…</div>;

  const max = Math.max(1, data.funnel.signups);

  return (
    <div style={styles.wrap}>
      <div style={styles.head}>
        <h3 style={{ margin: 0 }}>
          <TrendingUp size={18} /> Activation funnel
        </h3>
        <select
          className="form-control"
          style={{ width: 160 }}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last 12 months</option>
        </select>
      </div>

      <div style={styles.kpis}>
        <div className="card" style={styles.kpi}>
          <span style={styles.kpiLabel}>Activation rate</span>
          <strong style={styles.kpiValue}>{data.activationRate}%</strong>
          <span style={styles.muted}>signup → first daily report</span>
        </div>
        <div className="card" style={styles.kpi}>
          <span style={styles.kpiLabel}>Paid conversion</span>
          <strong style={styles.kpiValue}>{data.paidConversion}%</strong>
          <span style={styles.muted}>signup → approved payment</span>
        </div>
        <div className="card" style={styles.kpi}>
          <span style={styles.kpiLabel}>Plan mix</span>
          <strong style={styles.kpiValue}>
            {Object.entries(data.planCounts)
              .map(([plan, count]) => `${plan}: ${count}`)
              .join(' · ') || '—'}
          </strong>
          <span style={styles.muted}>companies per plan</span>
        </div>
      </div>

      <div style={styles.funnel}>
        {STAGES.map((stage) => {
          const value = data.funnel[stage.key] || 0;
          const share = Math.round((value / max) * 100);
          return (
            <div key={stage.key} style={styles.stageRow}>
              <span style={styles.stageLabel}>{stage.label}</span>
              <div style={styles.stageTrack}>
                <div
                  style={{
                    ...styles.stageFill,
                    width: `${Math.max(share, 2)}%`,
                    background: stage.key === 'paying' ? '#16A34A' : 'var(--primary-orange)',
                  }}
                />
              </div>
              <span style={styles.stageValue}>
                {value} <span style={styles.muted}>({share}%)</span>
              </span>
            </div>
          );
        })}
      </div>

      <h4 style={{ margin: '1.5rem 0 .5rem' }}>Newest companies</h4>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Signed up</th>
              <th>Site</th>
              <th>Workers</th>
              <th>Reports</th>
              <th>Plan</th>
              <th>Paying</th>
            </tr>
          </thead>
          <tbody>
            {data.recentCompanies.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                  No companies signed up in this window.
                </td>
              </tr>
            ) : (
              data.recentCompanies.slice(0, 25).map((company) => (
                <tr key={company._id}>
                  <td>
                    <strong>{company.name}</strong>
                  </td>
                  <td>{new Date(company.createdAt).toLocaleDateString()}</td>
                  <td>{company.hasSite ? 'Yes' : 'No'}</td>
                  <td>{company.hasWorkers ? 'Yes' : 'No'}</td>
                  <td>{company.hasReports ? 'Yes' : 'No'}</td>
                  <td>{company.plan}</td>
                  <td>{company.paying ? 'Yes' : 'No'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' },
  kpis: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' },
  kpi: { padding: '1rem', display: 'flex', flexDirection: 'column', gap: '.25rem' },
  kpiLabel: { fontSize: '.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '.04em' },
  kpiValue: { fontSize: '1.5rem', color: 'var(--dark-graphite)' },
  funnel: { display: 'flex', flexDirection: 'column', gap: '.55rem' },
  stageRow: { display: 'grid', gridTemplateColumns: '220px 1fr 110px', gap: '.75rem', alignItems: 'center' },
  stageLabel: { fontSize: '.82rem', color: 'var(--dark-graphite)' },
  stageTrack: { height: 14, background: 'var(--bg-light)', borderRadius: 6, overflow: 'hidden' },
  stageFill: { height: '100%', borderRadius: 6 },
  stageValue: { fontSize: '.82rem', fontWeight: 600, textAlign: 'right' },
  muted: { fontSize: '.75rem', color: 'var(--text-muted)' },
  error: { color: 'var(--alert-red)', fontSize: '.85rem' },
};

export default ActivationFunnel;
