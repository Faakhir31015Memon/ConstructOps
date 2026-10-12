import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Dashboard from './pages/Dashboard';

const HomeRedirect = () => {
  const token = localStorage.getItem('token');
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

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
    <Router>
      <Routes>
        {/* Public auth screens */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Private workspace layouts */}
        <Route element={<Layout title="ConstructOps Dashboard" />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
        </Route>

        {/* Fallback routes */}
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </Router>
  );
}

export default App;
