import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../ui/containers/useAuth';
import { useDashboard } from '../ui/containers/useDashboard';
import { LoginPage } from '../ui/pages/LoginPage';
import { DashboardPage } from '../ui/pages/DashboardPage';

export const AppRouter: React.FC = () => {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const { dashboardData, isLoading: isDashboardLoading } = useDashboard(user?.id || null);

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginPage onLogin={login} isLoading={isLoading} />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : user ? (
              <DashboardPage
                user={user}
                dashboardData={dashboardData}
                isLoading={isDashboardLoading}
                onLogout={logout}
              />
            ) : null
          }
        />
        <Route
          path="/"
          element={
            <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
          }
        />
      </Routes>
    </Router>
  );
};
