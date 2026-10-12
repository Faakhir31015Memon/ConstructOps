import React, { useEffect, useState } from 'react';
import { getDashboardStats, getUsers, updateUserStatus, deleteUser } from '../services/api';
import { Briefcase, Users, Layers, DollarSign, Calendar, Clock, MapPin, User, FileText, Lock, Unlock } from 'lucide-react';

const SvgBarChart = ({ data }) => {
  const chartHeight = 160;
  const chartWidth = 500;
  const paddingLeft = 40;
  const paddingBottom = 30;
  const graphHeight = chartHeight - paddingBottom;
  const graphWidth = chartWidth - paddingLeft;
  
  const maxVal = 100;
  const barWidth = 40;
  const gap = (graphWidth - (data.length * barWidth)) / (data.length + 1 || 1);

  return (
    <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((val) => {
        const y = graphHeight - (val / maxVal) * (graphHeight - 10);
        return (
          <g key={val}>
            <line x1={paddingLeft} y1={y} x2={chartWidth} y2={y} stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
            <text x={paddingLeft - 10} y={y + 4} fontSize="10" fill="var(--text-muted)" textAnchor="end">{val}%</text>
          </g>
        );
      })}
      
      {/* Bars */}
      {data.map((item, idx) => {
        const x = paddingLeft + gap + idx * (barWidth + gap);
        const barHeight = (item.progress / maxVal) * (graphHeight - 10);
        const y = graphHeight - barHeight;

        return (
          <g key={idx} style={{ cursor: 'pointer' }}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill="var(--primary-orange)"
              rx="4"
              style={{ transition: 'all 0.3s ease' }}
            />
            <text x={x + barWidth/2} y={chartHeight - 10} fontSize="10" fill="var(--dark-graphite)" textAnchor="middle">
              {item.name}
            </text>
            <text x={x + barWidth/2} y={y - 5} fontSize="9" fontWeight="600" fill="var(--primary-orange)" textAnchor="middle">
              {item.progress}%
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const SvgLineChart = ({ data }) => {
  const chartHeight = 160;
  const chartWidth = 500;
  const paddingLeft = 50;
  const paddingBottom = 30;
  const graphHeight = chartHeight - paddingBottom;
  const graphWidth = chartWidth - paddingLeft;

  const allVals = data.flatMap(d => [d.planned, d.actual]);
  const maxVal = Math.max(...allVals, 1000);
  
  const getCoordinates = (key) => {
    const stepX = graphWidth / (data.length - 1 || 1);
    return data.map((d, idx) => {
      const x = paddingLeft + idx * stepX;
      const y = graphHeight - (d[key] / maxVal) * (graphHeight - 15);
      return { x, y };
    });
  };

  const plannedCoords = getCoordinates('planned');
  const actualCoords = getCoordinates('actual');

  const makePath = (coords) => {
    return coords.reduce((path, c, idx) => {
      return path + `${idx === 0 ? 'M' : 'L'} ${c.x} ${c.y}`;
    }, '');
  };

  return (
    <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
      {/* Grid lines */}
      {[0, 0.5, 1].map((ratio) => {
        const val = Math.round(maxVal * ratio);
        const y = graphHeight - ratio * (graphHeight - 15);
        return (
          <g key={ratio}>
            <line x1={paddingLeft} y1={y} x2={chartWidth} y2={y} stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
            <text x={paddingLeft - 10} y={y + 4} fontSize="10" fill="var(--text-muted)" textAnchor="end">
              Rs {val >= 1000 ? (val / 1000) + 'k' : val}
            </text>
          </g>
        );
      })}

      {/* Planned Line */}
      <path d={makePath(plannedCoords)} fill="none" stroke="var(--steel-blue)" strokeWidth="2.5" strokeDasharray="4 4" />
      
      {/* Actual Line */}
      <path d={makePath(actualCoords)} fill="none" stroke="var(--primary-orange)" strokeWidth="3" />

      {/* Dots & Labels */}
      {data.map((d, idx) => {
        const pCoord = plannedCoords[idx];
        const aCoord = actualCoords[idx];
        return (
          <g key={idx}>
            <text x={pCoord.x} y={chartHeight - 10} fontSize="10" fill="var(--dark-graphite)" textAnchor="middle">
              {d.name}
            </text>
            <circle cx={pCoord.x} cy={pCoord.y} r="4" fill="var(--steel-blue)" />
            <circle cx={aCoord.x} cy={aCoord.y} r="4" fill="var(--primary-orange)" />
          </g>
        );
      })}
    </svg>
  );
};

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('projects');

  const fetchDashboardData = async () => {
    try {
      const res = await getDashboardStats();
      if (res.success) {
        setData(res);
      } else {
        setError(res.message || 'Error loading dashboard metrics');
      }

      const usersRes = await getUsers();
      if (usersRes.success) {
        setUsersList(usersRes.users);
      }
    } catch (err) {
      console.error(err);
      setError('Server connection error. Failed to load dashboard stats.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleUserStatusToggle = async (userId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'banned' : 'active';
    const confirmMsg = nextStatus === 'banned' 
      ? "Are you sure you want to deactivate/ban this user? Banned users will not be able to log in to ConstructOps."
      : "Are you sure you want to reactivate this user's account?";

    if (window.confirm(confirmMsg)) {
      try {
        setLoading(true);
        const res = await updateUserStatus(userId, nextStatus);
        if (res.success) {
          await fetchDashboardData();
        }
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || 'Failed to update user status');
        setLoading(false);
      }
    }
  };

  const handleUserDeactivate = async (userId, userName) => {
    const confirmMsg = `Are you sure you want to DEACTIVATE and COMPLETELY DELETE the user "${userName}"?\n\nThis will permanently remove their user data from the database, allowing them to sign up again with a fresh new account. This action is IRREVERSIBLE.`;

    if (window.confirm(confirmMsg)) {
      try {
        setLoading(true);
        const res = await deleteUser(userId);
        if (res.success) {
          alert('User account deactivated and completely deleted.');
          await fetchDashboardData();
        }
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || 'Failed to deactivate user');
        setLoading(false);
      }
    }
  };

  if (loading) return <div style={styles.loading}>Loading System Admin Dashboard...</div>;
  if (error || !data) return <div style={styles.errorBox}>{error || 'Failed to initialize'}</div>;

  const { stats, progressData, budgetData, workerData, detailedProjects, detailedExpenses, detailedReports, detailedWorkers } = data;

  const getRoleBadgeColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'owner': return '#D32F2F'; // Dark Red
      case 'manager': return '#E65100'; // Dark Orange
      case 'accountant': return '#1976D2'; // Blue
      default: return 'var(--text-muted)';
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'var(--success-green)';
      case 'completed': return 'var(--steel-blue)';
      case 'paused': return 'var(--primary-orange)';
      case 'banned': return 'var(--alert-red)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <div>
        <h1 style={styles.title}>System Admin Dashboard</h1>
        <p style={styles.subtitle}>Overview of all construction sites, labor attendance, and supplies.</p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card" style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <span>Active Projects</span>
            <Briefcase size={20} style={{ color: 'var(--steel-blue)' }} />
          </div>
          <h3>{stats.projects}</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered Sites</span>
        </div>

        <div className="card" style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <span>Labor Strength</span>
            <Users size={20} style={{ color: 'var(--success-green)' }} />
          </div>
          <h3>{stats.workers}</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Workers Registered</span>
        </div>

        <div className="card" style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <span>Materials Used</span>
            <Layers size={20} style={{ color: 'var(--primary-orange)' }} />
          </div>
          <h3>{stats.materials}</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Units Transacted</span>
        </div>

        <div className="card" style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <span>Total Outflow</span>
            <DollarSign size={20} style={{ color: 'var(--alert-red)' }} />
          </div>
          <h3>Rs {stats.budget.toLocaleString()}</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Spent Across Sites</span>
        </div>
      </div>

      {/* Charts Split grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        {/* Project Progress Bar Chart */}
        <div className="card" style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Project Completion Progress</h3>
          <p style={styles.chartSub}>Track percentage complete across your active sites</p>
          <div style={{ marginTop: '1.5rem' }}>
            {progressData.length > 0 ? (
              <SvgBarChart data={progressData} />
            ) : (
              <div style={styles.noData}>No active projects registered</div>
            )}
          </div>
        </div>

        {/* Budget vs Actual Line Chart */}
        <div className="card" style={styles.chartCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={styles.chartTitle}>Budget vs Actual Cost</h3>
              <p style={styles.chartSub}>Planned allocation (dashed) vs logged site outflow</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--steel-blue)' }}></span> Planned
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--primary-orange)' }}></span> Actual
              </span>
            </div>
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <SvgLineChart data={budgetData} />
          </div>
        </div>
      </div>

      {/* Audit & Logs Panel Section */}
      <div className="card" style={styles.auditCard}>
        <div style={styles.auditHeader}>
          <div>
            <h2 style={styles.chartTitle}>Detailed System Audits</h2>
            <p style={styles.chartSub}>Track timelines, expenditures, daily activity, and worker transactions.</p>
          </div>
          
          <div style={styles.tabButtons}>
            <button 
              onClick={() => setActiveTab('projects')} 
              style={{ ...styles.tabBtn, ...(activeTab === 'projects' ? styles.activeTabBtn : {}) }}
            >
              <Briefcase size={16} />
              <span>Projects</span>
            </button>
            <button 
              onClick={() => setActiveTab('expenses')} 
              style={{ ...styles.tabBtn, ...(activeTab === 'expenses' ? styles.activeTabBtn : {}) }}
            >
              <DollarSign size={16} />
              <span>Expenditures</span>
            </button>
            <button 
              onClick={() => setActiveTab('reports')} 
              style={{ ...styles.tabBtn, ...(activeTab === 'reports' ? styles.activeTabBtn : {}) }}
            >
              <FileText size={16} />
              <span>Daily Logs</span>
            </button>
            <button 
              onClick={() => setActiveTab('workers')} 
              style={{ ...styles.tabBtn, ...(activeTab === 'workers' ? styles.activeTabBtn : {}) }}
            >
              <Users size={16} />
              <span>Labor Directory</span>
            </button>
            <button 
              onClick={() => setActiveTab('users')} 
              style={{ ...styles.tabBtn, ...(activeTab === 'users' ? styles.activeTabBtn : {}) }}
            >
              <User size={16} />
              <span>Users Management</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Detailed Projects */}
        {activeTab === 'projects' && (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Project</th>
                  <th style={styles.th}>Location</th>
                  <th style={styles.th}>Duration</th>
                  <th style={styles.th}>Budget Allocation</th>
                  <th style={styles.th}>Spent</th>
                  <th style={styles.th}>Progress</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {detailedProjects.map((p) => (
                  <tr key={p.id} style={styles.tr}>
                    <td style={{ ...styles.td, fontWeight: '600' }}>{p.name}</td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                        <span>{p.location}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontSize: '0.8rem' }}>
                        <div>Start: {new Date(p.startDate).toLocaleDateString()}</div>
                        <div>End: {new Date(p.endDate).toLocaleDateString()}</div>
                      </div>
                    </td>
                    <td style={styles.td}>Rs {p.budget.toLocaleString()}</td>
                    <td style={{ ...styles.td, color: p.spent > p.budget ? 'var(--alert-red)' : 'inherit' }}>
                      Rs {p.spent.toLocaleString()}
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={styles.progressContainer}>
                          <div style={{ ...styles.progressBar, width: `${p.progress}%` }}></div>
                        </div>
                        <span>{p.progress}%</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{ 
                        ...styles.statusBadge, 
                        backgroundColor: getStatusBadgeColor(p.status) + '15', 
                        color: getStatusBadgeColor(p.status) 
                      }}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Detailed Expenditures */}
        {activeTab === 'expenses' && (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date & Time</th>
                  <th style={styles.th}>Project</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Description</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Logged By</th>
                </tr>
              </thead>
              <tbody>
                {detailedExpenses.map((exp) => (
                  <tr key={exp._id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                        <span>
                          {new Date(exp.date).toLocaleDateString()} {new Date(exp.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: '500' }}>{exp.projectId?.name || 'Unknown Project'}</div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{exp.projectId?.location}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.categoryTag}>{exp.category}</span>
                    </td>
                    <td style={{ ...styles.td, fontSize: '0.85rem' }}>{exp.description}</td>
                    <td style={{ ...styles.td, fontWeight: '700', color: 'var(--alert-red)' }}>
                      Rs {exp.amount.toLocaleString()}
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={styles.userIcon}>
                          <User size={12} />
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{exp.addedBy?.name || 'System'}</div>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            color: getRoleBadgeColor(exp.addedBy?.role),
                            fontWeight: '700'
                          }}>
                            {exp.addedBy?.role?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Detailed Daily Reports */}
        {activeTab === 'reports' && (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date & Time</th>
                  <th style={styles.th}>Project</th>
                  <th style={styles.th}>Work Stage</th>
                  <th style={styles.th}>Activity Description</th>
                  <th style={styles.th}>Photos</th>
                  <th style={styles.th}>Logged By</th>
                </tr>
              </thead>
              <tbody>
                {detailedReports.map((rep) => (
                  <tr key={rep._id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                        <span>
                          {new Date(rep.date).toLocaleDateString()} {new Date(rep.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: '500' }}>{rep.projectId?.name || 'Unknown Project'}</div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rep.projectId?.location}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.categoryTag, backgroundColor: '#E0F7FA', color: '#006064' }}>
                        {rep.workType}
                      </span>
                    </td>
                    <td style={{ ...styles.td, fontSize: '0.85rem', maxWidth: '300px', wordBreak: 'break-word' }}>
                      {rep.description}
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {rep.images && rep.images.length > 0 ? (
                          rep.images.map((img, idx) => (
                            <img 
                              key={idx} 
                              src={img} 
                              alt="Site capture" 
                              style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }}
                            />
                          ))
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No images</span>
                        )}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={styles.userIcon}>
                          <User size={12} />
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{rep.addedBy?.name || 'System'}</div>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            color: getRoleBadgeColor(rep.addedBy?.role),
                            fontWeight: '700'
                          }}>
                            {rep.addedBy?.role?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Detailed Labor Strength */}
        {activeTab === 'workers' && (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Worker Name</th>
                  <th style={styles.th}>Designated Job / Role</th>
                  <th style={styles.th}>Assigned Construction Site</th>
                  <th style={styles.th}>Daily Wage Rate</th>
                  <th style={styles.th}>Contact Number</th>
                </tr>
              </thead>
              <tbody>
                {detailedWorkers && detailedWorkers.map((worker) => (
                  <tr key={worker._id} style={styles.tr}>
                    <td style={{ ...styles.td, fontWeight: '600' }}>{worker.name}</td>
                    <td style={styles.td}>
                      <span style={{ 
                        ...styles.categoryTag, 
                        backgroundColor: 'rgba(255, 107, 0, 0.1)', 
                        color: 'var(--primary-orange)' 
                      }}>
                        {worker.role}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: '500' }}>{worker.projectId?.name || 'Unassigned'}</div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{worker.projectId?.location}</span>
                    </td>
                    <td style={{ ...styles.td, fontWeight: '700' }}>
                      Rs {worker.dailyWage.toLocaleString()} / day
                    </td>
                    <td style={styles.td}>{worker.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 5: User Management */}
        {activeTab === 'users' && (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>User Details</th>
                  <th style={styles.th}>Registered Company</th>
                  <th style={styles.th}>Account Role</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Control Action</th>
                </tr>
              </thead>
              <tbody>
                {usersList && usersList.map((userItem) => (
                  <tr key={userItem._id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: '600' }}>{userItem.name}</div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{userItem.email}</span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: '500' }}>{userItem.companyId?.name || 'ConstructOps Partner'}</div>
                    </td>
                    <td style={styles.td}>
                      <span style={{ 
                        ...styles.categoryTag, 
                        backgroundColor: getRoleBadgeColor(userItem.role) + '15',
                        color: getRoleBadgeColor(userItem.role),
                        fontWeight: '700' 
                      }}>
                        {userItem.role}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ 
                        ...styles.statusBadge, 
                        backgroundColor: getStatusBadgeColor(userItem.status || 'active') + '15', 
                        color: getStatusBadgeColor(userItem.status || 'active') 
                      }}>
                        {userItem.status || 'active'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {/* Ban / Unban Toggle Button */}
                        <button
                          onClick={() => handleUserStatusToggle(userItem._id, userItem.status || 'active')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            color: '#ffffff',
                            backgroundColor: (userItem.status === 'banned') ? 'var(--success-green)' : 'var(--alert-red)',
                            transition: 'all 0.2s',
                          }}
                        >
                          {userItem.status === 'banned' ? (
                            <>
                              <Unlock size={14} />
                              <span>Unban User</span>
                            </>
                          ) : (
                            <>
                              <Lock size={14} />
                              <span>Ban User</span>
                            </>
                          )}
                        </button>

                        {/* Deactivate & Clear Button */}
                        <button
                          onClick={() => handleUserDeactivate(userItem._id, userItem.name)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            border: '1px solid var(--alert-red)',
                            borderRadius: '4px',
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            color: 'var(--alert-red)',
                            backgroundColor: 'transparent',
                            transition: 'all 0.2s',
                          }}
                        >
                          <Users size={14} />
                          <span>Deactivate & Clear</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
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
    padding: '5rem',
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
  errorBox: {
    backgroundColor: 'var(--alert-red-light)',
    color: 'var(--alert-red)',
    padding: '1.5rem',
    borderRadius: 'var(--radius-md)',
    textAlign: 'center',
    maxWidth: '450px',
    margin: '3rem auto',
    fontWeight: '500',
  },
  metricCard: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '120px',
    padding: '1.5rem',
  },
  metricHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
  },
  chartCard: {
    padding: '1.5rem',
  },
  chartTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: 'var(--dark-graphite)',
  },
  chartSub: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    marginTop: '0.15rem',
  },
  noData: {
    textAlign: 'center',
    color: 'var(--text-muted)',
    padding: '3rem',
    fontSize: '0.9rem',
  },
  auditCard: {
    padding: '2rem',
  },
  auditHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1.5rem',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '1.25rem',
    marginBottom: '1.5rem',
  },
  tabButtons: {
    display: 'flex',
    gap: '0.5rem',
    backgroundColor: 'var(--bg-light)',
    padding: '0.25rem',
    borderRadius: 'var(--radius-sm)',
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    border: 'none',
    background: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  activeTabBtn: {
    backgroundColor: '#ffffff',
    color: 'var(--primary-orange)',
    boxShadow: 'var(--shadow-sm)',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    padding: '0.75rem 1rem',
    fontSize: '0.78rem',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '2px solid var(--border-color)',
  },
  td: {
    padding: '1rem',
    fontSize: '0.9rem',
    color: 'var(--dark-graphite)',
    borderBottom: '1px solid var(--border-color)',
    verticalAlign: 'middle',
  },
  tr: {
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: 'rgba(0,0,0,0.01)',
    },
  },
  progressContainer: {
    width: '80px',
    height: '6px',
    backgroundColor: 'var(--border-color)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'var(--primary-orange)',
    borderRadius: '3px',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: '700',
    borderRadius: '10px',
    textTransform: 'capitalize',
  },
  categoryTag: {
    display: 'inline-block',
    padding: '0.2rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: '600',
    borderRadius: '4px',
    backgroundColor: '#ECEFF1',
    color: '#37474F',
    textTransform: 'uppercase',
  },
  userIcon: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
  },
};

export default Dashboard;
