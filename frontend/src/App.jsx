import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Dashboard from './pages/Dashboard';
import Contractors from './pages/Contractors';

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

// Client-side gate only — the API re-checks every role. This prevents
// contractor/accountant tokens from landing on admin-labeled screens.
const RequireRole = ({ roles, children }) => {
  const token = localStorage.getItem('token');
  const user = getStoredUser();
  if (!token) return <Navigate to="/login" replace />;
  if (!roles.includes(user?.role)) return <Navigate to="/projects" replace />;
  return children;
};

const HomeRedirect = () => {
  const token = localStorage.getItem('token');
  const user = getStoredUser();

  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (user && (user.role === 'admin' || user.role === 'owner' || user.role === 'manager')) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/projects" replace />;
};

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Public auth screens */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Private workspace layouts */}
        <Route element={<Layout title="ConstructOps Dashboard" />}>
          <Route path="/dashboard" element={<RequireRole roles={['admin', 'owner', 'manager']}><Dashboard /></RequireRole>} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/contractors" element={<RequireRole roles={['admin', 'owner', 'manager']}><Contractors /></RequireRole>} />
        </Route>

        {/* Fallback routes */}
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </Router>
  );
}

export default App;
