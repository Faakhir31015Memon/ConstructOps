import React, { useEffect, useState } from 'react';
import { getPayroll, payrollInvoiceUrl } from '../services/api';
import InvoiceButton from './InvoiceButton';
import { FileDown, Users, Wallet } from 'lucide-react';

const currentMonth = () => new Date().toISOString().slice(0, 7);

const money = (n) => Number(n || 0).toLocaleString('en-PK');

const PayrollPanel = ({ projectId }) => {
  const [month, setMonth] = useState(currentMonth());
  const [payroll, setPayroll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (value = month) => {
    setLoading(true);
    setError('');
    try {
      const res = await getPayroll(projectId, value);
      if (res.success) setPayroll(res.payroll);
      else setError('Payroll could not be loaded.');
    } catch {
      setError('Payroll could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h3 style={{ margin: 0 }}>{payroll ? payroll.periodLabel : 'Monthly Payroll'}</h3>
          <p style={styles.sub}>Wages are calculated from attendance: days present × daily wage.</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          <input
            type="month"
            className="form-control"
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              load(e.target.value);
            }}
          />
          <InvoiceButton
            url={payrollInvoiceUrl(projectId, month)}
            label="Statement PDF"
            title="Download the monthly payroll statement"
          />
        </div>
      </div>

      {error && <div style={styles.notice}>{error}</div>}
      {loading && <div style={styles.sub}>Loading payroll…</div>}

      {!loading && payroll && (
        <>
          <div style={styles.cards}>
            <div className="card" style={styles.card}>
              <span style={styles.cardLabel}>
                <Users size={14} /> Workers on roster
              </span>
              <strong>{payroll.rows.length}</strong>
            </div>
            <div className="card" style={styles.card}>
              <span style={styles.cardLabel}>
                <Wallet size={14} /> Days paid
              </span>
              <strong>{money(payroll.totals.daysPresent)}</strong>
            </div>
            <div className="card" style={styles.card}>
              <span style={styles.cardLabel}>Gross wages</span>
              <strong>Rs {money(payroll.totals.amount)}</strong>
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>Role</th>
                  <th>Daily wage</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {payroll.rows.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No workers on this site yet.
                    </td>
                  </tr>
                ) : (
                  payroll.rows.map((row) => (
                    <tr key={row.workerId}>
                      <td>
                        <strong>{row.name}</strong>
                        <div style={styles.sub}>{row.phone || '—'}</div>
                      </td>
                      <td>{row.role}</td>
                      <td>Rs {money(row.dailyWage)}</td>
                      <td>{row.daysPresent}</td>
                      <td>{row.daysAbsent}</td>
                      <td style={{ fontWeight: 600 }}>Rs {money(row.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: '1rem',
    flexWrap: 'wrap',
    marginBottom: '1rem',
  },
  sub: { fontSize: '.75rem', color: 'var(--text-muted)', margin: '2px 0 0' },
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
    margin: '1rem 0 1.5rem',
  },
  card: { padding: '1rem', display: 'flex', flexDirection: 'column', gap: '.35rem' },
  cardLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '.4rem',
    fontSize: '.75rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  notice: {
    background: '#FEF3C7',
    color: '#92400E',
    padding: '.6rem .9rem',
    borderRadius: 8,
    fontSize: '.85rem',
    marginBottom: '1rem',
  },
};

export default PayrollPanel;
