import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  Layers, 
  DollarSign, 
  Bell, 
  Settings, 
  LogOut,
  HardHat,
  X
} from 'lucide-react';
import { useLang } from '../i18n/LanguageContext';
import LanguageSelect from './LanguageSelect';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { t } = useLang();
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <aside className={`app-sidebar ${isOpen ? 'app-sidebar-open' : ''}`}>
      {/* Brand Header */}
      <div style={styles.brand} className="sidebar-brand-row">
        <svg width="180" height="45" viewBox="0 0 400 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* C Shape */}
          <path d="M80 20 A30 30 0 1 0 80 80 L65 70 A18 18 0 1 1 65 30 Z" fill="#FFFFFF"/>
          {/* Building Lines */}
          <rect x="70" y="30" width="6" height="40" fill="#FF6B00"/>
          <rect x="80" y="35" width="6" height="30" fill="#FFFFFF"/>
          <rect x="90" y="40" width="6" height="20" fill="#FFFFFF"/>
          {/* Text */}
          <text x="120" y="62" fontFamily="Poppins, Arial, sans-serif" fontSize="36" fill="#FFFFFF" fontWeight="700">
            Construct
          </text>
          <text x="310" y="62" fontFamily="Poppins, Arial, sans-serif" fontSize="36" fill="#FF6B00" fontWeight="800">
            Ops
          </text>
        </svg>

        {onClose && (
          <button 
            type="button" 
            className="sidebar-close-btn" 
            onClick={onClose}
            aria-label="Close navigation sidebar"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* User Card */}
      {user && (
        <div style={styles.userCard}>
          <div style={styles.avatar}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div style={styles.userInfo}>
            <h4 style={styles.userName}>{user.name}</h4>
            <span style={styles.userRole}>{user.role.toUpperCase()}</span>
          </div>
        </div>
      )}

      {/* Nav Menu */}
      <div style={styles.menuList}>
        {user && user.role === 'admin' && (
          <NavLink 
            to="/dashboard" 
            style={({ isActive }) => ({
              ...styles.menuItem,
              ...(isActive ? styles.activeMenuItem : {})
            })}
          >
            <LayoutDashboard size={20} />
            <span>{t('Admin Dashboard')}</span>
          </NavLink>
        )}

        {/* Company Owner & Moderator Dashboard */}
        {user && (user.role === 'owner' || user.role === 'manager') && (
          <NavLink 
            to="/dashboard" 
            style={({ isActive }) => ({
              ...styles.menuItem,
              ...(isActive ? styles.activeMenuItem : {})
            })}
          >
            <LayoutDashboard size={20} />
            <span>{t('Company Dashboard')}</span>
          </NavLink>
        )}

        <NavLink 
          to="/projects" 
          style={({ isActive }) => ({
            ...styles.menuItem,
            ...(isActive || location.pathname.includes('/projects/') ? styles.activeMenuItem : {})
          })}
        >
          <Briefcase size={20} />
          <span>{user?.role === 'contractor' ? t('My Assigned Projects') : t('Projects')}</span>
        </NavLink>

        {/* Contractor Management — Owner & Manager Only */}
        {user && (user.role === 'owner' || user.role === 'manager') && (
          <NavLink 
            to="/contractors" 
            style={({ isActive }) => ({
              ...styles.menuItem,
              ...(isActive ? styles.activeMenuItem : {})
            })}
          >
            <HardHat size={20} />
            <span>{t('Contractors')}</span>
          </NavLink>
        )}
      </div>



      {/* Footer Logout Button */}
      <button onClick={handleLogout} style={styles.logoutBtn}>
        <LogOut size={20} />
        <span>{t('Log Out')}</span>
      </button>
    </aside>
  );
};

const styles = {
  sidebar: {
    width: '260px',
    backgroundColor: 'var(--bg-sidebar)',
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'sticky',
    top: 0,
    padding: '1.5rem',
    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '2rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 'var(--radius-sm)',
    marginBottom: '2rem',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-orange)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '1.2rem',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  userName: {
    fontSize: '0.95rem',
    color: '#ffffff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userRole: {
    fontSize: '0.7rem',
    color: 'var(--primary-orange)',
    fontWeight: '600',
    letterSpacing: '0.5px',
  },
  menuList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    flexGrow: 1,
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.95rem',
    fontWeight: '500',
    color: '#bdbdbd',
    transition: 'all var(--transition-fast)',
    cursor: 'pointer',
  },
  activeMenuItem: {
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    color: 'var(--primary-orange)',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.95rem',
    fontWeight: '500',
    color: '#EB5757',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'background var(--transition-fast)',
    marginTop: 'auto',
  },
};

export default Sidebar;
