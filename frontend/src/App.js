import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';

const PrivateRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={styles.loading}>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/login" />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/teacher/*"
            element={
              <PrivateRoute role="teacher">
                <TeacherDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/student/*"
            element={
              <PrivateRoute role="student">
                <StudentDashboard />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

const styles = {
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '1.2rem',
    color: '#4f46e5',
  },
};

export default App;
