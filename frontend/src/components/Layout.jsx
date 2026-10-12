import React, { useEffect, useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = ({ title }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  if (!token) {
    return null; // Prevents flashing content while redirecting
  }

  return (
    <div className="app-layout">
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      <div className="main-viewport">
        <Navbar 
          title={title} 
          onToggleSidebar={() => setSidebarOpen(prev => !prev)} 
        />
        <main className="main-content-scroll">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
