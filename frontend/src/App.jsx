import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import UploadScan from './pages/UploadScan';
import History from './pages/History';
import About from './pages/About';
import PatientReport from './pages/PatientReport';
import SidebarLayout from './components/SidebarLayout';

// Auth guard component - checks localStorage for admin/doctor token
function RequireAuth({ children }) {
  const token = localStorage.getItem('gstnet_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/new-diagnosis" element={<UploadScan />} />
        <Route path="/patient-report" element={<PatientReport />} />

        {/* Protected Doctor/Admin Portal routes wrapped in SidebarLayout + Auth Guard */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <SidebarLayout><Dashboard /></SidebarLayout>
            </RequireAuth>
          }
        />

        <Route
          path="/upload"
          element={
            <RequireAuth>
              <SidebarLayout><UploadScan /></SidebarLayout>
            </RequireAuth>
          }
        />

        <Route
          path="/history"
          element={
            <RequireAuth>
              <SidebarLayout><History /></SidebarLayout>
            </RequireAuth>
          }
        />

        <Route
          path="/about"
          element={
            <RequireAuth>
              <SidebarLayout><About /></SidebarLayout>
            </RequireAuth>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
