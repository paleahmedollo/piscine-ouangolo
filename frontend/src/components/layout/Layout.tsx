import React, { useState } from 'react';
import { Box, Toolbar, Chip } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../contexts/AuthContext';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PeopleIcon from '@mui/icons-material/People';
import BadgeIcon from '@mui/icons-material/Badge';

const drawerWidth = 240;

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

const QuickAccessBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { canAccessModule } = useAuth();

  const shortcuts = [
    { label: 'Rapports', path: '/reports', module: 'reports', icon: <AssessmentIcon sx={{ fontSize: 14 }} /> },
    { label: 'Caisse', path: '/caisse', module: 'caisse', icon: <AccountBalanceWalletIcon sx={{ fontSize: 14 }} /> },
    { label: 'Utilisateurs', path: '/users', module: 'users', icon: <PeopleIcon sx={{ fontSize: 14 }} /> },
    { label: 'Employés & Paie', path: '/employees', module: 'employees', icon: <BadgeIcon sx={{ fontSize: 14 }} /> },
  ];

  const accessible = shortcuts.filter(s => canAccessModule(s.module));
  if (accessible.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', gap: 0.75, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
      {accessible.map(s => (
        <Chip
          key={s.path}
          label={s.label}
          icon={s.icon}
          size="small"
          onClick={() => navigate(s.path)}
          variant={location.pathname === s.path ? 'filled' : 'outlined'}
          color={location.pathname === s.path ? 'primary' : 'default'}
          sx={{
            cursor: 'pointer',
            fontSize: '0.72rem',
            height: 26,
            fontWeight: location.pathname === s.path ? 700 : 400,
            '&:hover': { opacity: 0.8 }
          }}
        />
      ))}
    </Box>
  );
};

const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar mobileOpen={mobileOpen} onDrawerToggle={handleDrawerToggle} />
      <Header title={title} onMenuClick={handleDrawerToggle} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1.5, sm: 2, md: 3 },
          width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: '#f5f5f5',
          overflowX: 'hidden'
        }}
      >
        <Toolbar />
        <QuickAccessBar />
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
