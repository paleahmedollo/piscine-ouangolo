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
import Companies from './pages/Companies';
import LavageAuto from './pages/LavageAuto';
import Pressing from './pages/Pressing';
import Maquis from './pages/Maquis';
import Superette from './pages/Superette';
import Depot from './pages/Depot';
import Cuisine from './pages/Cuisine';
import LandingPage from './pages/LandingPage';

// Super Admin pages
import SuperAdminLayout from './pages/Admin/SuperAdminLayout';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminUsers from './pages/Admin/AdminUsers';
import AdminSubscriptions from './pages/Admin/AdminSubscriptions';
import AdminBilling from './pages/Admin/AdminBilling';
import AdminTickets from './pages/Admin/AdminTickets';
import AdminReports from './pages/Admin/AdminReports';
import AdminSettings from './pages/Admin/AdminSettings';
import AdminLogs from './pages/Admin/AdminLogs';
import SuperAdminLeads from './pages/Admin/SuperAdminLeads';

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

// Loading Component
const LoadingScreen: React.FC = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    Chargement...
  </div>
);

// Protected Route Component (for regular users)
const ProtectedRoute: React.FC<{ children: React.ReactNode; module?: string; redirectTo?: string }> = ({
  children, module, redirectTo = '/'
}) => {
  const { isAuthenticated, isLoading, canAccessModule } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (module && !canAccessModule(module)) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
};

// Super Admin Protected Route
const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'super_admin') return <Navigate to="/" replace />;
  return <>{children}</>;
};

// Route for dashboard - redirects superadmin to admin dashboard
const DashboardRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, canAccessModule, user } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // Le super_admin va vers son dashboard dédié
  if (user?.role === 'super_admin') return <Navigate to="/admin/dashboard" replace />;
  // Le cuisinier va directement vers la vue cuisine
  if (user?.role === 'cuisinier') return <Navigate to="/cuisine" replace />;
  // Le caissier va directement vers la caisse
  if (user?.role === 'caissier') return <Navigate to="/caisse" replace />;
  // Si l'utilisateur n'a pas accès au dashboard, le rediriger vers ses rapports
  if (!canAccessModule('dashboard')) return <Navigate to="/reports" replace />;
  return <>{children}</>;
};

// Public Route (redirect to dashboard if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// App Routes
const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* ─── Landing Page (publique, sans auth) ──────── */}
      <Route path="/landing" element={<LandingPage />} />

      {/* ─── Public Routes ────────────────────────────── */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

      {/* ─── Super Admin Routes ───────────────────────── */}
      <Route
        path="/admin"
        element={<SuperAdminRoute><SuperAdminLayout /></SuperAdminRoute>}
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="companies" element={<Companies />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="subscriptions" element={<AdminSubscriptions />} />
        <Route path="billing" element={<AdminBilling />} />
        <Route path="tickets" element={<AdminTickets />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="leads" element={<SuperAdminLeads />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="logs" element={<AdminLogs />} />
      </Route>

      {/* Legacy /companies route → redirect vers admin layout */}
      <Route
        path="/companies"
        element={<SuperAdminRoute><Navigate to="/admin/companies" replace /></SuperAdminRoute>}
      />

      {/* ─── Regular User Routes ──────────────────────── */}
      <Route path="/" element={<DashboardRoute><Dashboard /></DashboardRoute>} />
      <Route path="/piscine" element={<ProtectedRoute module="piscine"><Piscine /></ProtectedRoute>} />
      <Route path="/restaurant" element={<ProtectedRoute module="restaurant"><Restaurant /></ProtectedRoute>} />
      <Route path="/hotel" element={<ProtectedRoute module="hotel"><Hotel /></ProtectedRoute>} />
      <Route path="/events" element={<ProtectedRoute module="events"><Events /></ProtectedRoute>} />
      <Route path="/caisse" element={<ProtectedRoute module="caisse"><Caisse /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute module="users"><Users /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute module="reports"><Reports /></ProtectedRoute>} />
      <Route path="/employees" element={<ProtectedRoute module="employees"><Employees /></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute module="expenses"><Expenses /></ProtectedRoute>} />

      <Route path="/lavage" element={<ProtectedRoute module="lavage"><LavageAuto /></ProtectedRoute>} />
      <Route path="/pressing" element={<ProtectedRoute module="pressing"><Pressing /></ProtectedRoute>} />
      <Route path="/maquis" element={<ProtectedRoute module="maquis"><Maquis /></ProtectedRoute>} />
      <Route path="/superette" element={<ProtectedRoute module="superette"><Superette /></ProtectedRoute>} />
      <Route path="/depot" element={<ProtectedRoute module="depot"><Depot /></ProtectedRoute>} />
      <Route path="/cuisine" element={<ProtectedRoute module="cuisine"><Cuisine /></ProtectedRoute>} />

      {/* Catch all */}
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
