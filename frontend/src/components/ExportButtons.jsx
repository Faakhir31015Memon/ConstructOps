import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { exportProjectReport, exportCompanyReport, saveBlobToDisk } from '../services/api';
import { useLang } from '../i18n/LanguageContext';

const FORMATS = [
  { key: 'xlsx', label: 'Excel', Icon: FileSpreadsheet },
  { key: 'pdf', label: 'PDF', Icon: FileText },
];

export default function ExportButtons({ projectId, label = 'Full project report', compact = false }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const handleExport = async (format) => {
  const { t } = useLang();
    setBusy(format);
    setError('');
    setDone('');
    try {
      const result = projectId
        ? await exportProjectReport(projectId, format)
        : await exportCompanyReport(format);
      saveBlobToDisk(result.blob, result.filename);
      setDone(result.filename);
    } catch (err) {
      setError(err.message || 'Download failed. Please try again.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div style={styles.wrapper}>
      {!compact && <span style={styles.label}>{label}</span>}
      <div style={styles.buttons}>
        {FORMATS.map(({ key, label: text, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => handleExport(key)}
            disabled={Boolean(busy)}
            style={{ ...styles.button, ...(busy === key ? styles.buttonBusy : {}) }}
            title={`Download ${text} report`}
          >
            <Icon size={15} />
            <span>{busy === key ? 'Preparing...' : text}</span>
          </button>
        ))}
      </div>
      {busy === '' && done ? (
        <span style={styles.success}>
          <Download size={13} /> {done}
        </span>
      ) : null}
      {error ? <span style={styles.error}>{error}</span> : null}
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '0.4rem',
  },
  label: {
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'var(--text-muted)',
  },
  buttons: {
    display: 'flex',
    gap: '0.5rem',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.5rem 0.85rem',
    borderRadius: 'var(--radius-sm, 8px)',
    border: '1px solid var(--border-color, #e5e7eb)',
    background: 'var(--surface, #fff)',
    color: 'var(--dark-graphite, #1f2937)',
    fontSize: '0.82rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  buttonBusy: {
    opacity: 0.6,
    cursor: 'progress',
  },
  success: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontSize: '0.75rem',
    color: 'var(--success-green, #16a34a)',
  },
  error: {
    fontSize: '0.75rem',
    color: 'var(--alert-red, #dc2626)',
  },
};
