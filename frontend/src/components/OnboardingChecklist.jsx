import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCompanyActivation } from '../services/api';
import { CheckCircle2, Circle, X, Rocket } from 'lucide-react';

const DISMISS_KEY = 'constructops_onboarding_dismissed';

const NEXT_LINK = {
  site: { to: '/projects', label: 'Add your first site' },
  labour: { to: '/projects', label: 'Register workers' },
  report: { to: '/projects', label: 'File a daily report' },
  costs: { to: '/projects', label: 'Log an expense' },
};

const OnboardingChecklist = () => {
  const [activation, setActivation] = useState(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');

  useEffect(() => {
    let alive = true;
    getCompanyActivation()
      .then((res) => {
        if (alive && res.success) setActivation(res.activation);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (dismissed || !activation || activation.percent === 100) return null;

  const link = NEXT_LINK[activation.nextStep];

  return (
    <section style={styles.card}>
      <div style={styles.head}>
        <div style={styles.title}>
          <Rocket size={18} color="var(--primary-orange)" />
          <div>
            <strong>Set up {activation.counts.projects > 0 ? 'your workspace' : 'ConstructOps'}</strong>
            <div style={styles.sub}>
              {activation.completedSteps} of {activation.totalSteps} steps done
              {activation.subscription?.isTrial && activation.subscription.status !== 'expired'
                ? ` · Trial: ${activation.subscription.daysRemaining} days left`
                : ''}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, '1');
            setDismissed(true);
          }}
          style={styles.close}
          aria-label="Hide setup checklist"
        >
          <X size={16} />
        </button>
      </div>

      <div style={styles.track}>
        <div style={styles.fill(activation.percent)} />
      </div>

      <ul style={styles.list}>
        {activation.steps.map((step) => (
          <li key={step.key} style={styles.item}>
            {step.done ? (
              <CheckCircle2 size={16} color="#16A34A" />
            ) : (
              <Circle size={16} color="var(--text-muted)" />
            )}
            <span style={step.done ? styles.done : styles.todo}>{step.label}</span>
          </li>
        ))}
      </ul>

      {activation.limits && (
        <div style={styles.usage}>
          {activation.counts.projects} of {activation.limits.maxProjects} sites ·{' '}
          {activation.counts.users} of {activation.limits.maxUsers} users
        </div>
      )}

      {link && (
        <Link to={link.to} style={styles.cta}>
          {link.label} →
        </Link>
      )}
    </section>
  );
};

const styles = {
  card: {
    background: 'var(--bg-white)',
    border: '1px solid var(--border-color)',
    borderLeft: '4px solid var(--primary-orange)',
    borderRadius: 'var(--radius-lg)',
    padding: '1rem 1.25rem',
    marginBottom: '1.25rem',
    boxShadow: 'var(--shadow-sm)',
  },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' },
  title: { display: 'flex', alignItems: 'center', gap: '.6rem', fontSize: '.9rem' },
  sub: { fontSize: '.75rem', color: 'var(--text-muted)' },
  close: {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    padding: '.2rem',
  },
  track: { height: 6, background: 'var(--bg-light)', borderRadius: 999, margin: '.85rem 0' },
  fill: (percent) => ({
    height: '100%',
    width: `${percent}%`,
    background: 'var(--primary-orange)',
    borderRadius: 999,
    transition: 'width .3s ease',
  }),
  list: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: '.5rem 1.5rem' },
  item: { display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.82rem' },
  done: { color: 'var(--text-muted)', textDecoration: 'line-through' },
  todo: { color: 'var(--dark-graphite)', fontWeight: 600 },
  cta: {
    display: 'inline-block',
    marginTop: '.8rem',
    fontSize: '.82rem',
    fontWeight: 600,
    color: 'var(--primary-orange)',
    textDecoration: 'none',
  },
  usage: { marginTop: '.7rem', fontSize: '.75rem', color: 'var(--text-muted)' },
};

export default OnboardingChecklist;
