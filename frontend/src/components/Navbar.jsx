import React, { useEffect, useState } from 'react';
import { Bell, Briefcase, Check } from 'lucide-react';
import { getAlerts, markAlertRead } from '../services/api';

const Navbar = ({ title }) => {
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

  const [alerts, setAlerts] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await getAlerts();
      if (res.success) {
        setAlerts(res.alerts);
      }
    } catch (err) {
      console.error('Failed to fetch navbar alerts:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await markAlertRead(id);
      if (res.success) {
        setAlerts(prev => prev.map(a => a._id === id ? { ...a, isRead: true } : a));
      }
    } catch (err) {
      console.error('Failed to mark alert as read:', err);
    }
  };

  const unreadCount = alerts.filter(a => !a.isRead).length;

  return (
    <div style={styles.navbar}>
      <div style={styles.left}>
        <h2 style={styles.title}>{title || 'ConstructOps Dashboard'}</h2>
      </div>

      <div style={styles.right}>
        {user && user.companyName && (
          <div style={styles.companyBadge}>
            <Briefcase size={16} />
            <span>{user.companyName}</span>
          </div>
        )}

        {/* Real-time Notifications Center */}
        <div style={styles.notificationWrapper}>
          <div style={styles.notificationIcon} onClick={() => setShowDropdown(!showDropdown)}>
            <Bell size={20} />
            {unreadCount > 0 && <span style={styles.dot}>{unreadCount}</span>}
          </div>

          {showDropdown && (
            <div style={styles.dropdown}>
              <div style={styles.dropdownHeader}>
                <span style={styles.dropdownTitle}>Alert Notifications</span>
                {unreadCount > 0 && <span style={styles.unreadBadge}>{unreadCount} new</span>}
              </div>
              <div style={styles.dropdownList}>
                {alerts.length === 0 ? (
                  <div style={styles.emptyState}>No notifications logged recently</div>
                ) : (
                  alerts.map((alert) => (
                    <div 
                      key={alert._id} 
                      style={{ 
                        ...styles.dropdownItem, 
                        backgroundColor: alert.isRead ? 'transparent' : 'rgba(255, 107, 0, 0.04)' 
                      }}
                    >
                      <div style={styles.itemContent}>
                        <div style={{ fontWeight: '600', fontSize: '0.82rem', color: 'var(--dark-graphite)' }}>
                          {alert.message}
                        </div>
                        <span style={styles.projectLabel}>
                          Project: {alert.projectId?.name || 'ConstructOps System'}
                        </span>
                      </div>
                      {!alert.isRead && (
                        <button 
                          onClick={(e) => handleMarkRead(alert._id, e)}
                          style={styles.markReadBtn}
                          title="Mark as read"
                        >
                          <Check size={12} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div style={styles.profileSection}>
          <div style={styles.divider}></div>
          <div style={styles.details}>
            <span style={styles.name}>{user ? user.name : 'User'}</span>
            <span style={styles.role}>{user ? user.role.toUpperCase() : ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  navbar: {
    height: '70px',
    backgroundColor: 'var(--bg-white)',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 2rem',
    position: 'sticky',
    top: 0,
    zIndex: 900,
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: 'var(--dark-graphite)',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  companyBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.4rem 0.8rem',
    backgroundColor: 'var(--bg-light)',
    border: '1px solid var(--border-color)',
    borderRadius: '50px',
    fontSize: '0.85rem',
    fontWeight: '500',
    color: 'var(--dark-graphite)',
  },
  notificationWrapper: {
    position: 'relative',
  },
  notificationIcon: {
    position: 'relative',
    cursor: 'pointer',
    color: 'var(--dark-graphite)',
    padding: '4px',
    borderRadius: '50%',
    transition: 'background var(--transition-fast)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-light)',
    width: '36px',
    height: '36px',
  },
  dot: {
    position: 'absolute',
    top: '-3px',
    right: '-3px',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-orange)',
    border: '2px solid var(--bg-white)',
    color: '#ffffff',
    fontSize: '0.62rem',
    fontWeight: '800',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdown: {
    position: 'absolute',
    top: '46px',
    right: '0',
    width: '320px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    border: '1px solid var(--border-color)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  dropdownHeader: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'var(--bg-light)',
  },
  dropdownTitle: {
    fontWeight: '700',
    fontSize: '0.9rem',
    color: 'var(--dark-graphite)',
  },
  unreadBadge: {
    backgroundColor: 'var(--primary-orange)',
    color: '#ffffff',
    fontSize: '0.7rem',
    fontWeight: '700',
    padding: '0.15rem 0.4rem',
    borderRadius: '10px',
  },
  dropdownList: {
    maxHeight: '260px',
    overflowY: 'auto',
  },
  dropdownItem: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'background-color 0.2s',
  },
  itemContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
    flex: 1,
  },
  projectLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  markReadBtn: {
    border: 'none',
    background: 'rgba(255, 107, 0, 0.1)',
    color: 'var(--primary-orange)',
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  emptyState: {
    padding: '2rem 1rem',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
  },
  profileSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  divider: {
    height: '24px',
    width: '1px',
    backgroundColor: 'var(--border-color)',
  },
  details: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'right',
  },
  name: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--dark-graphite)',
  },
  role: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    fontWeight: '600',
  },
};

export default Navbar;
