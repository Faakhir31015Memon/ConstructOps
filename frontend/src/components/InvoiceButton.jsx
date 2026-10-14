import React, { useState } from 'react';
import { FileDown } from 'lucide-react';
import { downloadInvoice } from '../services/api';

const InvoiceButton = ({ url, label = 'Invoice', title }) => {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const handle = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const { blob, filename } = await downloadInvoice(url);
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(href);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className="btn"
      style={styles.btn}
      onClick={handle}
      disabled={busy}
      title={failed ? 'The document could not be generated.' : title || label}
    >
      <FileDown size={14} />
      <span>{busy ? '…' : failed ? 'Retry' : label}</span>
    </button>
  );
};

const styles = {
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '.35rem',
    padding: '.3rem .6rem',
    fontSize: '.75rem',
    fontWeight: 600,
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-light)',
    cursor: 'pointer',
  },
};

export default InvoiceButton;
