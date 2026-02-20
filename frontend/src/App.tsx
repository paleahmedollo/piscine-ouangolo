import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { frFR } from '@mui/material/locale';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Piscine from './pages/Piscine';
import Restaurant from './pages/Restaurant';
import Hotel from './pages/Hotel';
import Events from './pages/Events';
import Caisse from './pages/Caisse';
import Users from './pages/Users';
import Reports from './pages/Reports';
import Employees from './pages/Employees';
import Expenses from './pages/Expenses';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1a237e',
    },
    secondary: {
      main: '#0d47a1',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
  },
}, frFR);

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; module?: string; redirectTo?: string }> = ({
  children,
  module,
  redirectTo = '/'
}) => {
  const { isAuthenticated, isLoading, canAccessModule } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        Chargement...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (module && !canAccessModule(module)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

// Route for dashboard - redirects employees to reports
const DashboardRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, canAccessModule } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        Chargement...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si l'utilisateur n'a pas acces au dashboard, le rediriger vers ses rapports
  if (!canAccessModule('dashboard')) {
    return <Navigate to="/reports" replace />;
  }

  return <>{children}</>;
};

// Public Route (redirect to dashboard if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        Chargement...
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// App Routes
const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <DashboardRoute>
            <Dashboard />
          </DashboardRoute>
        }
      />

      <Route
        path="/piscine"
        element={
          <ProtectedRoute module="piscine">
            <Piscine />
          </ProtectedRoute>
        }
      />

      <Route
        path="/restaurant"
        element={
          <ProtectedRoute module="restaurant">
            <Restaurant />
          </ProtectedRoute>
        }
      />

      <Route
        path="/hotel"
        element={
          <ProtectedRoute module="hotel">
            <Hotel />
          </ProtectedRoute>
        }
      />

      <Route
        path="/events"
        element={
          <ProtectedRoute module="events">
            <Events />
          </ProtectedRoute>
        }
      />

      <Route
        path="/caisse"
        element={
          <ProtectedRoute module="caisse">
            <Caisse />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute module="users">
            <Users />
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute module="reports">
            <Reports />
          </ProtectedRoute>
        }
      />

      <Route
        path="/employees"
        element={
          <ProtectedRoute module="employees">
            <Employees />
          </ProtectedRoute>
        }
      />

      <Route
        path="/expenses"
        element={
          <ProtectedRoute module="expenses">
            <Expenses />
          </ProtectedRoute>
        }
      />

      {/* Catch all - redirect to dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Main App Component
const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
