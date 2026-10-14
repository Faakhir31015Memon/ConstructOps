import React, { useEffect, useState } from 'react';
import { getDigestSettings, saveDigestSettings, triggerDigest } from '../services/api';
import { MessageCircle, Send, Eye } from 'lucide-react';

const DigestPanel = ({ projectId, projectName }) => {
  const [numbers, setNumbers] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [lastDigestAt, setLastDigestAt] = useState(null);
  const [gatewayConfigured, setGatewayConfigured] = useState(false);
  const [preview, setPreview] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getDigestSettings();
        if (!alive || !res.success) return;
        setGatewayConfigured(Boolean(res.gatewayConfigured));
        const found = res.projects.find((p) => String(p._id) === String(projectId));
        if (found) {
          setNumbers((found.whatsappNumbers || []).join('\n'));
          setEnabled(Boolean(found.dailyDigest));
          setLastDigestAt(found.lastDigestAt);
        } else if (projectName) {
          setStatus('Only active sites can send digests.');
        }
      } catch {
        if (alive) setStatus('Digest settings could not be loaded.');
      }
    })();
    return () => {
      alive = false;
    };
  }, [projectId, projectName]);

  const save = async () => {
    setSaving(true);
    setStatus('');
    try {
      const list = numbers
        .split(/[\n,]/)
        .map((n) => n.trim())
        .filter(Boolean);
      const res = await saveDigestSettings(projectId, enabled, list);
      if (res.success) setStatus('Settings saved.');
      else setStatus('Settings could not be saved.');
    } catch {
      setStatus('Settings could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const run = async (send) => {
    setBusy(true);
    setStatus('');
    setPreview('');
    try {
      const res = await triggerDigest(projectId, send);
      setPreview(res.preview || '');
      if (res.sent) {
        setStatus(`Sent to ${(res.recipients || []).length} number(s).`);
        setLastDigestAt(new Date().toISOString());
      } else if (res.gatewayConfigured === false) {
        setStatus('WhatsApp is not configured on the server yet — showing preview only.');
      } else {
        setStatus(res.reason === 'no-recipients' ? 'No numbers saved yet.' : 'Preview ready.');
      }
    } catch {
      setStatus('The digest could not be generated.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.head}>
        <h3 style={{ margin: 0 }}>
          <MessageCircle size={18} style={{ verticalAlign: -4 }} /> Daily Site Digest
        </h3>
        <span style={styles.pill(gatewayConfigured)}>
          {gatewayConfigured ? 'WhatsApp connected' : 'WhatsApp not configured'}
        </span>
      </div>
      <p style={styles.muted}>
        End of day, owners and site managers get budget, labour, material and progress figures on
        WhatsApp. Numbers are stored per site.
      </p>

      <label style={styles.checkbox}>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Send automatically every evening for this site
      </label>

      <div style={styles.field}>
        <label style={styles.label}>WhatsApp numbers (one per line, +92 format)</label>
        <textarea
          className="form-control"
          rows={3}
          value={numbers}
          placeholder='+92 300 1234567'
          onChange={(e) => setNumbers(e.target.value)}
          style={{ fontFamily: 'inherit' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          <span>{saving ? 'Saving…' : 'Save settings'}</span>
        </button>
        <button className="btn" onClick={() => run(false)} disabled={busy}>
          <Eye size={16} />
          <span>Preview</span>
        </button>
        <button className="btn" onClick={() => run(true)} disabled={busy}>
          <Send size={16} />
          <span>Send now</span>
        </button>
      </div>

      {status && <div style={styles.notice}>{status}</div>}

      {preview && (
        <pre style={styles.preview}>{preview}</pre>
      )}

      {lastDigestAt && (
        <p style={styles.muted}>Last digest: {new Date(lastDigestAt).toLocaleString()}</p>
      )}
    </div>
  );
};

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '.9rem', maxWidth: 680 },
  head: { display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' },
  pill: (on) => ({
    fontSize: '.72rem',
    fontWeight: 600,
    padding: '.2rem .6rem',
    borderRadius: 999,
    background: on ? '#DCFCE7' : '#FEE9C7',
    color: on ? '#166534' : '#92400E',
  }),
  muted: { fontSize: '.8rem', color: 'var(--text-muted)', margin: 0 },
  checkbox: { display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '.35rem' },
  label: { fontSize: '.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' },
  notice: {
    background: '#EFF6FF',
    color: '#1E40AF',
    padding: '.6rem .9rem',
    borderRadius: 8,
    fontSize: '.85rem',
  },
  preview: {
    background: '#111827',
    color: '#E5E7EB',
    padding: '1rem',
    borderRadius: 10,
    whiteSpace: 'pre-wrap',
    fontSize: '.8rem',
    lineHeight: 1.5,
    margin: 0,
  },
};

export default DigestPanel;
