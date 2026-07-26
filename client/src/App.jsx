import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { useAuthRefresh } from './hooks/useAuthRefresh';
import { useTheme } from './hooks/useTheme';
import { Toaster } from 'react-hot-toast';

import Dashboard from './components/dashboard/Dashboard';
import ProjectCanvasWrapper from './components/canvas/ProjectCanvasWrapper';

function App() {
  const loading = useAuthRefresh();
  useTheme();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>
        Loading...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/project/:projectId" element={<ProjectCanvasWrapper />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" />
    </Router>
  );
}

export default App;
