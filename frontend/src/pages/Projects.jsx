import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects, createProject } from '../services/api';
import { Plus, MapPin, DollarSign, Calendar, Sliders, PlayCircle } from 'lucide-react';
import { useLang } from '../i18n/LanguageContext';

const Projects = () => {
  const { t, locale } = useLang();
  const [projects, setProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formError, setFormError] = useState('');

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  const fetchProjectsList = async () => {
    try {
      const data = await getProjects();
      if (data.success) {
        setProjects(data.projects);
      }
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectsList();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setFormError('');

    if (new Date(startDate) > new Date(endDate)) {
      setFormError(t('Start date cannot be after end date.'));
      return;
    }

    try {
      const data = await createProject({
        name,
        location,
        budget: Number(budget),
        startDate,
        endDate,
      });

      if (data.success) {
        setShowModal(false);
        // Reset forms
        setName('');
        setLocation('');
        setBudget('');
        setStartDate('');
        setEndDate('');
        fetchProjectsList();
      }
    } catch (err) {
      setFormError(t(err.response?.data?.message || 'Failed to create project'));
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'active':
        return 'badge-success';
      case 'completed':
        return 'badge-info';
      case 'paused':
        return 'badge-warning';
      default:
        return 'badge-info';
    }
  };

  return (
    <div style={styles.container}>
      {/* Page Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            {user?.role === 'contractor' ? t('My Assigned Construction Sites') : t('All Construction Projects')}
          </h1>
          <p style={styles.subtitle}>
            {user?.role === 'contractor'
              ? t('Access site modules and submit daily records for assigned projects.')
              : t('Manage active locations, budgets, and track progress.')}
          </p>
        </div>
        {user && ['owner', 'manager', 'admin'].includes(user.role) && (
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus size={18} />
            <span>{t('New Project')}</span>
          </button>
        )}
      </div>

      {loading ? (
        <div style={styles.loading}>{t('Loading projects...')}</div>
      ) : projects.length === 0 ? (
        <div style={styles.emptyState}>
          <h3>{user?.role === 'contractor' ? t('No Projects Assigned') : t('No projects registered')}</h3>
          <p>
            {user?.role === 'contractor'
              ? t('You do not have any active project assignments yet. Contact your Company Owner.')
              : t('Get started by creating your first construction project site.')}
          </p>
          {user && ['owner', 'manager', 'admin'].includes(user.role) && (
            <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ marginTop: '1rem' }}>
              <Plus size={18} />
              <span>{t('Create Project')}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-3">
          {projects.map((proj) => (
            <div key={proj._id} className="card" style={styles.projectCard}>
              <div style={styles.cardHeader}>
                <h3 style={styles.projectName}>{proj.name}</h3>
                <span className={`badge ${getStatusStyle(proj.status)}`}>{t(proj.status)}</span>
              </div>
              
              <div style={styles.cardBody}>
                <div style={styles.infoRow}>
                  <MapPin size={16} style={styles.icon} />
                  <span>{proj.location}</span>
                </div>
                
                <div style={styles.infoRow}>
                  <DollarSign size={16} style={styles.icon} />
                  <span>{t('Budget')}: Rs {proj.budget.toLocaleString(locale)}</span>
                </div>

                <div style={styles.infoRow}>
                  <DollarSign size={16} style={{ color: 'var(--primary-orange)' }} />
                  <span>{t('Spent')}: Rs {proj.spent.toLocaleString(locale)}</span>
                </div>

                <div style={styles.infoRow}>
                  <DollarSign size={16} style={{ color: (proj.budget - proj.spent) >= 0 ? 'var(--success-green)' : 'var(--alert-red)' }} />
                  <span style={{ color: (proj.budget - proj.spent) >= 0 ? 'var(--success-green)' : 'var(--alert-red)', fontWeight: '600' }}>
                    {t('Remaining')}: Rs {(proj.budget - proj.spent).toLocaleString(locale)}
                  </span>
                </div>
                
                <div style={styles.infoRow}>
                  <Calendar size={16} style={styles.icon} />
                  <span>{t('Ends')}: {new Date(proj.endDate).toLocaleDateString(locale)}</span>
                </div>

                {/* Progress bar */}
                <div style={styles.progressSection}>
                  <div style={styles.progressLabels}>
                    <span>{t('Completion Progress')}</span>
                    <span>{proj.progress}%</span>
                  </div>
                  <div style={styles.progressBarBg}>
                    <div style={{ ...styles.progressBarFill, width: `${proj.progress}%` }}></div>
                  </div>
                </div>
              </div>

              <div style={styles.cardFooter}>
                <button 
                  onClick={() => navigate(`/projects/${proj._id}`)} 
                  className="btn btn-outline w-full"
                >
                  <PlayCircle size={16} />
                  <span>{t('Enter Site Dashboard')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal Dialog */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: '1rem' }}>{t('Initialize New Project')}</h2>
            <button onClick={() => setShowModal(false)} className="modal-close">×</button>
            
            {formError && (
              <div style={styles.formError}>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label>{t('Project Site Name')}</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={t('e.g. House No. 45 Phase 6')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('Location City/Address')}</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={t('e.g. DHA, Karachi')}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('Allocated Budget (PKR)')}</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder={t('e.g. 5000000')}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label>{t('Start Date')}</label>
                  <input
                    type="date"
                    className="form-control"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('Target End Date')}</label>
                  <input
                    type="date"
                    className="form-control"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                  {t('Cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t('Create Project')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '1.75rem',
    color: 'var(--dark-graphite)',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
  },
  loading: {
    textAlign: 'center',
    padding: '3rem',
    color: 'var(--text-muted)',
  },
  emptyState: {
    backgroundColor: 'var(--bg-white)',
    borderRadius: 'var(--radius-md)',
    padding: '4rem 2rem',
    textAlign: 'center',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid rgba(0,0,0,0.05)',
  },
  projectCard: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '260px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
  },
  projectName: {
    fontSize: '1.15rem',
    fontWeight: '600',
    color: 'var(--dark-graphite)',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1.5rem',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: 'var(--dark-graphite-text)',
  },
  icon: {
    color: 'var(--text-muted)',
  },
  progressSection: {
    marginTop: '1rem',
  },
  progressLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--dark-graphite)',
    marginBottom: '0.35rem',
  },
  progressBarBg: {
    height: '8px',
    backgroundColor: 'var(--bg-light)',
    borderRadius: '50px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'var(--primary-orange)',
    borderRadius: '50px',
    transition: 'width 0.4s ease',
  },
  cardFooter: {
    marginTop: 'auto',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    marginTop: '1.5rem',
  },
  formError: {
    backgroundColor: 'var(--alert-red-light)',
    color: 'var(--alert-red)',
    padding: '0.75rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    marginBottom: '1rem',
  },
};

export default Projects;
