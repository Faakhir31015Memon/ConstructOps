import React, { useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { getAuditEvents } from '../services/api';
import { useLang } from '../i18n/LanguageContext';

const RESOURCE_FILTERS = ['projects', 'workers', 'materials', 'expenses', 'reports', 'contractors', 'subscription', 'auth'];

const AuditTrail = () => {
  const { t, locale } = useLang();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resourceType, setResourceType] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAuditEvents(resourceType ? { resourceType } : {});
      setEvents(data.events || []);
    } catch (err) {
      setError(t(err.response?.data?.message || 'Could not load the audit trail.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceType]);

  const formatTime = (value) =>
    new Date(value).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div style={styles.page} dir="auto">
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            <ShieldCheck size={20} /> {t('Audit trail')}
          </h1>
          <p style={styles.subtitle}>
            {t('Every create, update and delete on this account — who did it, when, from which device.')}
          </p>
        </div>
        <div style={styles.controls}>
          <select
            className="form-control"
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            style={styles.select}
          >
            <option value="">{t('All areas')}</option>
            {RESOURCE_FILTERS.map((r) => (
              <option key={r} value={r}>{t(r)}</option>
            ))}
          </select>
          <button type="button" className="btn" style={styles.refreshBtn} onClick={load} disabled={loading}>
            <RefreshCw size={16} /> {t('Refresh')}
          </button>
        </div>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      <div style={styles.table}>
        <div style={{ ...styles.row, ...styles.headRow }}>
          <span>{t('When')}</span>
          <span>{t('Action')}</span>
          <span>{t('User')}</span>
          <span>{t('Device / IP')}</span>
        </div>

        {loading && <div style={styles.empty}>{t('Loading...')}</div>}

        {!loading && events.length === 0 && (
          <div style={styles.empty}>{t('No activity recorded yet.')}</div>
        )}

        {!loading &&
          events.map((event) => (
            <div key={event._id} style={styles.row}>
              <span style={styles.time}>{formatTime(event.createdAt)}</span>
              <span style={styles.action}>{event.action}</span>
              <span>
                {event.actorName} <em style={styles.role}>{event.actorRole}</em>
              </span>
              <span style={styles.device}>
                {event.ip || '—'}
                <div style={styles.ua}>{event.userAgent}</div>
              </span>
            </div>
          ))}
      </div>
    </div>
  );
};

const styles = {
  page: { padding: '1.5rem' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: '1rem',
    flexWrap: 'wrap',
    marginBottom: '1.25rem',
  },
  title: { fontSize: '1.4rem', fontWeight: '700', color: 'var(--dark-graphite)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' },
  subtitle: { color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.35rem' },
  controls: { display: 'flex', gap: '0.6rem', alignItems: 'center' },
  select: { padding: '0.45rem 0.7rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: '#fff' },
  refreshBtn: { display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-light)' },
  table: { backgroundColor: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' },
  row: {
    display: 'grid',
    gridTemplateColumns: '190px 1.1fr 1fr 1.4fr',
    gap: '0.75rem',
    padding: '0.8rem 1rem',
    borderBottom: '1px solid var(--border-color)',
    fontSize: '0.85rem',
    color: 'var(--dark-graphite)',
    alignItems: 'start',
  },
  headRow: { fontWeight: '700', backgroundColor: 'var(--bg-light)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.03em' },
  time: { color: 'var(--text-muted)' },
  action: { fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' },
  role: { color: 'var(--text-muted)', fontSize: '0.72rem', fontStyle: 'normal', textTransform: 'uppercase' },
  device: { color: 'var(--text-muted)', wordBreak: 'break-word' },
  ua: { fontSize: '0.72rem', color: '#aab2bd', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '320px' },
  empty: { padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' },
  errorBox: {
    padding: '0.75rem 1rem',
    backgroundColor: 'var(--alert-red-light)',
    color: 'var(--alert-red)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    marginBottom: '1rem',
  },
};

export default AuditTrail;
