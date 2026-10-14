import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getContractors,
  createContractor,
  getProjects,
  assignContractor,
  revokeContractor,
} from '../services/api';
import { useLang } from '../i18n/LanguageContext';
import PasswordInput from '../components/PasswordInput';
import {
  UserPlus,
  Users,
  Briefcase,
  CheckCircle,
  XCircle,
  Mail,
  Shield,
  ShieldOff,
  Plus,
  X,
  Search,
  RefreshCw,
} from 'lucide-react';

const Contractors = () => {
  const { t } = useLang();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  // State
  const [contractors, setContractors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Contractor Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPassword, setCPassword] = useState('');
  const [creating, setCreating] = useState(false);

  // Assign Contractor Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignContractorId, setAssignContractorId] = useState('');
  const [assignProjectId, setAssignProjectId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Guard: only owner/manager/admin
  useEffect(() => {
    if (!user || !['owner', 'manager', 'admin'].includes(user.role)) {
      navigate('/projects');
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [contRes, projRes] = await Promise.all([getContractors(), getProjects()]);
      if (contRes.success) setContractors(contRes.contractors);
      if (projRes.success) setProjects(projRes.projects);
    } catch (err) {
      setError('Failed to load contractors. ' + (err.response?.data?.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateContractor = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await createContractor({ name: cName, email: cEmail, password: cPassword });
      if (res.success) {
        setSuccessMsg(`Contractor "${cName}" account created successfully!`);
        setCName(''); setCEmail(''); setCPassword('');
        setShowCreateModal(false);
        fetchData();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating contractor');
    } finally {
      setCreating(false);
    }
  };

  const handleAssignToProject = async (e) => {
    e.preventDefault();
    if (!assignContractorId || !assignProjectId) return;
    setAssigning(true);
    try {
      const res = await assignContractor(assignProjectId, assignContractorId);
      if (res.success) {
        setSuccessMsg('Contractor assigned to project successfully!');
        setShowAssignModal(false);
        setAssignContractorId('');
        setAssignProjectId('');
        fetchData();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error assigning contractor');
    } finally {
      setAssigning(false);
    }
  };

  const handleRevokeFromProject = async (contractorId, projectId, projectName) => {
    if (!window.confirm(`Remove this contractor from "${projectName}"?`)) return;
    try {
      const res = await revokeContractor(projectId, contractorId);
      if (res.success) {
        setSuccessMsg('Contractor access revoked.');
        fetchData();
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error revoking access');
    }
  };

  const filteredContractors = contractors.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div style={styles.loading}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary-orange)' }} />
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>{t('Loading contractor registry...')}</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Page Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>
            <Users size={28} style={{ color: 'var(--primary-orange)', marginRight: '0.75rem' }} />
            {t('Contractor Management')}
          </h1>
          <p style={styles.pageSubtitle}>
            Register contractors, manage their project access, and control site permissions.
          </p>
        </div>
        <div style={styles.headerActions}>
          <button
            onClick={() => { setShowAssignModal(true); }}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Briefcase size={16} />
            {t('Assign to Project')}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <UserPlus size={16} />
            {t('Add Contractor')}
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMsg && (
        <div style={styles.successAlert}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={styles.errorAlert}>
          <XCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Row */}
      <div style={styles.statsRow}>
        <div className="card" style={styles.statCard}>
          <div style={styles.statIcon}><Users size={22} style={{ color: 'var(--primary-orange)' }} /></div>
          <div>
            <div style={styles.statValue}>{contractors.length}</div>
            <div style={styles.statLabel}>{t('Total Contractors')}</div>
          </div>
        </div>
        <div className="card" style={styles.statCard}>
          <div style={styles.statIcon}><CheckCircle size={22} style={{ color: 'var(--success-green)' }} /></div>
          <div>
            <div style={styles.statValue}>
              {contractors.filter((c) => c.status === 'active').length}
            </div>
            <div style={styles.statLabel}>{t('Active Contractors')}</div>
          </div>
        </div>
        <div className="card" style={styles.statCard}>
          <div style={styles.statIcon}><Briefcase size={22} style={{ color: 'var(--steel-blue)' }} /></div>
          <div>
            <div style={styles.statValue}>
              {contractors.filter((c) => c.assignedProjects?.length > 0).length}
            </div>
            <div style={styles.statLabel}>{t('Currently Assigned')}</div>
          </div>
        </div>
        <div className="card" style={styles.statCard}>
          <div style={styles.statIcon}><Shield size={22} style={{ color: '#9b59b6' }} /></div>
          <div>
            <div style={styles.statValue}>{projects.length}</div>
            <div style={styles.statLabel}>{t('Total Projects')}</div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={styles.searchBar}>
        <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          type="text"
          placeholder={t('Search contractors by name or email...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={styles.clearSearch}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Contractors Grid */}
      {filteredContractors.length === 0 ? (
        <div style={styles.emptyState}>
          <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
            {searchQuery ? 'No contractors match your search' : 'No contractors registered yet'}
          </h3>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
              style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={16} />
              {t('Add First Contractor')}
            </button>
          )}
        </div>
      ) : (
        <div style={styles.contractorsGrid}>
          {filteredContractors.map((contractor) => (
            <div key={contractor._id} className="card" style={styles.contractorCard}>
              {/* Card Header */}
              <div style={styles.cardHeader}>
                <div style={styles.avatarCircle}>
                  {contractor.name.charAt(0).toUpperCase()}
                </div>
                <div style={styles.cardMeta}>
                  <h3 style={styles.contractorName}>{contractor.name}</h3>
                  <div style={styles.contractorEmail}>
                    <Mail size={12} />
                    <span>{contractor.email}</span>
                  </div>
                </div>
                <span
                  style={{
                    ...styles.statusBadge,
                    backgroundColor:
                      contractor.status === 'active'
                        ? 'rgba(39, 174, 96, 0.15)'
                        : 'rgba(235, 87, 87, 0.15)',
                    color:
                      contractor.status === 'active'
                        ? 'var(--success-green)'
                        : 'var(--alert-red)',
                  }}
                >
                  {contractor.status === 'active' ? (
                    <CheckCircle size={12} />
                  ) : (
                    <XCircle size={12} />
                  )}
                  {contractor.status}
                </span>
              </div>

              {/* Assigned Projects */}
              <div style={styles.assignedSection}>
                <div style={styles.assignedLabel}>
                  <Briefcase size={14} style={{ color: 'var(--primary-orange)' }} />
                  <span>Assigned Projects ({contractor.assignedProjects?.length || 0})</span>
                </div>
                {contractor.assignedProjects?.length > 0 ? (
                  <div style={styles.projectTagsContainer}>
                    {contractor.assignedProjects.map((proj) => (
                      <div key={proj._id} style={styles.projectTag}>
                        <span style={styles.projectTagName}>{proj.name}</span>
                        <span style={styles.projectTagLoc}>{proj.location}</span>
                        <button
                          onClick={() => handleRevokeFromProject(contractor._id, proj._id, proj.name)}
                          style={styles.revokeTagBtn}
                          title={t('Revoke access')}
                        >
                          <ShieldOff size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={styles.noProjects}>{t('No projects assigned yet')}</p>
                )}
              </div>

              {/* Card Actions */}
              <div style={styles.cardActions}>
                <button
                  onClick={() => {
                    setAssignContractorId(contractor._id);
                    setShowAssignModal(true);
                  }}
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '0.4rem 0.75rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  <Plus size={14} />
                  {t('Assign Project')}
                </button>
                <button
                  onClick={() => navigate(`/projects`)}
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '0.4rem 0.75rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  <Briefcase size={14} />
                  {t('View Projects')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE CONTRACTOR MODAL */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <UserPlus size={22} style={{ color: 'var(--primary-orange)' }} />
              {t('Register New Contractor')}
            </h2>
            <button onClick={() => setShowCreateModal(false)} className="modal-close">×</button>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Create a login account for your contractor. They will only see projects you assign to them.
            </p>
            <form onSubmit={handleCreateContractor} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>{t('Full Name')}</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={t('e.g. Ahmed Khan')}
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('Email Address')}</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="e.g. ahmed@example.com"
                  value={cEmail}
                  onChange={(e) => setCEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('Temporary Password')}</label>
                <PasswordInput
                  placeholder={t('Set a strong password')}
                  value={cPassword}
                  onChange={(e) => setCPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  {t('Share this password securely with the contractor.')}
                </small>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN TO PROJECT MODAL */}
      {showAssignModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Shield size={22} style={{ color: 'var(--primary-orange)' }} />
              {t('Assign Contractor to Project')}
            </h2>
            <button onClick={() => { setShowAssignModal(false); setAssignContractorId(''); }} className="modal-close">×</button>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Assigned contractors will gain access to that project's workspace and can submit expenses.
            </p>
            <form onSubmit={handleAssignToProject} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>{t('Select Contractor')}</label>
                <select
                  className="form-control"
                  value={assignContractorId}
                  onChange={(e) => setAssignContractorId(e.target.value)}
                  required
                >
                  <option value="">{t('-- Choose Contractor --')}</option>
                  {contractors.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{t('Select Project')}</label>
                <select
                  className="form-control"
                  value={assignProjectId}
                  onChange={(e) => setAssignProjectId(e.target.value)}
                  required
                >
                  <option value="">{t('-- Choose Project --')}</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} — {p.location}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255,107,0,0.08)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <Shield size={14} style={{ color: 'var(--primary-orange)', marginRight: '0.5rem' }} />
                The contractor will only be able to view and work within the assigned project.
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => { setShowAssignModal(false); setAssignContractorId(''); }}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={assigning}
                >
                  {assigning ? 'Assigning...' : 'Grant Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  pageTitle: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: 'var(--dark-graphite)',
    display: 'flex',
    alignItems: 'center',
    marginBottom: '0.35rem',
  },
  pageSubtitle: {
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
    marginLeft: '2.5rem',
  },
  headerActions: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  successAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.85rem 1.25rem',
    backgroundColor: 'rgba(39, 174, 96, 0.12)',
    border: '1px solid rgba(39, 174, 96, 0.3)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--success-green)',
    marginBottom: '1.5rem',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.85rem 1.25rem',
    backgroundColor: 'rgba(235, 87, 87, 0.12)',
    border: '1px solid rgba(235, 87, 87, 0.3)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--alert-red)',
    marginBottom: '1.5rem',
    fontSize: '0.9rem',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.25rem',
  },
  statIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statValue: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: 'var(--dark-graphite)',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    marginTop: '0.25rem',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    backgroundColor: '#fff',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-sm)',
    marginBottom: '1.5rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '0.95rem',
    color: 'var(--dark-graphite)',
    backgroundColor: 'transparent',
  },
  clearSearch: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    padding: '0.2rem',
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    backgroundColor: '#fff',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-light)',
  },
  contractorsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '1.5rem',
  },
  contractorCard: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
  },
  avatarCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-orange)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '1.25rem',
    flexShrink: 0,
  },
  cardMeta: {
    flex: 1,
    minWidth: 0,
  },
  contractorName: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--dark-graphite)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  contractorEmail: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    marginTop: '0.2rem',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.2rem 0.6rem',
    borderRadius: '999px',
    fontSize: '0.72rem',
    fontWeight: '600',
    flexShrink: 0,
    textTransform: 'capitalize',
  },
  assignedSection: {
    borderTop: '1px solid var(--border-light)',
    paddingTop: '1rem',
  },
  assignedLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.82rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    marginBottom: '0.6rem',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  projectTagsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  projectTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    backgroundColor: 'rgba(255, 107, 0, 0.07)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(255, 107, 0, 0.15)',
  },
  projectTagName: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--dark-graphite)',
    flex: 1,
  },
  projectTagLoc: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  revokeTagBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--alert-red)',
    display: 'flex',
    alignItems: 'center',
    padding: '0.15rem',
    borderRadius: '4px',
    transition: 'background 0.15s',
  },
  noProjects: {
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    padding: '0.5rem 0',
  },
  cardActions: {
    display: 'flex',
    gap: '0.5rem',
    borderTop: '1px solid var(--border-light)',
    paddingTop: '1rem',
  },
};

export default Contractors;
