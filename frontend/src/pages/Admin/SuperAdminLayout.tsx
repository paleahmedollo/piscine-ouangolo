import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, AppBar, Typography, IconButton, Avatar, Menu, MenuItem,
  Divider, Tooltip, Chip, useTheme, useMediaQuery
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  CardMembership as SubscriptionIcon,
  Receipt as BillingIcon,
  SupportAgent as TicketIcon,
  BarChart as ReportsIcon,
  Settings as SettingsIcon,
  Article as LogsIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  ChevronLeft as ChevronLeftIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import GestixLogo from '../../components/GestixLogo';

const DRAWER_WIDTH = 260;

// ─── Menu Items ────────────────────────────────────────
const menuItems = [
  { label: 'Tableau de bord', icon: <DashboardIcon />, path: '/admin/dashboard', color: '#1a237e' },
  { label: 'Entreprises', icon: <BusinessIcon />, path: '/admin/companies', color: '#0d47a1' },
  { label: 'Utilisateurs', icon: <PeopleIcon />, path: '/admin/users', color: '#1565c0' },
  { divider: true },
  { label: 'Abonnements', icon: <SubscriptionIcon />, path: '/admin/subscriptions', color: '#2e7d32' },
  { label: 'Facturation', icon: <BillingIcon />, path: '/admin/billing', color: '#1b5e20' },
  { divider: true },
  { label: 'Assistance (Billets)', icon: <TicketIcon />, path: '/admin/tickets', color: '#e65100' },
  { label: 'Rapports', icon: <ReportsIcon />, path: '/admin/reports', color: '#4a148c' },
  { divider: true },
  { label: 'Paramètres', icon: <SettingsIcon />, path: '/admin/settings', color: '#37474f' },
  { label: 'Système de journaux', icon: <LogsIcon />, path: '/admin/logs', color: '#263238' },
];

const SuperAdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleLogout = () => { logout(); navigate('/login'); };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #0d1b4b 0%, #1a237e 100%)' }}>
      {/* Logo */}
      <Box sx={{ p: 2.5, pb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}>
          <GestixLogo size={42} variant="white" />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.2, fontSize: '1rem' }}>
            Gestix
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>
            Super Administration
          </Typography>
        </Box>
        {isMobile && (
          <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: '#fff', ml: 'auto' }}>
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Box>

      {/* Admin Info */}
      <Box sx={{ px: 2, pb: 2 }}>
        <Box sx={{
          background: 'rgba(255,255,255,0.08)', borderRadius: 2, p: 1.5,
          display: 'flex', alignItems: 'center', gap: 1.5
        }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: '#42a5f5', fontSize: '0.85rem' }}>
            {user?.full_name?.[0] || 'S'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.full_name || 'Super Admin'}
            </Typography>
            <Chip label="Super Admin" size="small"
              sx={{ bgcolor: 'rgba(66,165,245,0.2)', color: '#90caf9', fontSize: '0.65rem', height: 18, mt: 0.3 }} />
          </Box>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 1 }} />

      {/* Navigation Menu */}
      <List sx={{ flex: 1, px: 1, overflowY: 'auto', '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.2)', borderRadius: 2 } }}>
        {menuItems.map((item, idx) => {
          if ('divider' in item && item.divider) {
            return <Divider key={idx} sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 0.5 }} />;
          }
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <ListItemButton
              key={item.path}
              onClick={() => { navigate(item.path!); if (isMobile) setDrawerOpen(false); }}
              sx={{
                borderRadius: 2, mb: 0.3, py: 1,
                background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                '&:hover': { background: 'rgba(255,255,255,0.1)' },
                transition: 'all 0.2s'
              }}
            >
              <ListItemIcon sx={{ minWidth: 38, color: isActive ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.7)'
                }}
              />
              {isActive && (
                <Box sx={{ width: 3, height: 20, bgcolor: '#42a5f5', borderRadius: 2 }} />
              )}
            </ListItemButton>
          );
        })}
      </List>

      {/* Footer */}
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      <Box sx={{ p: 1.5 }}>
        <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2, color: 'rgba(255,100,100,0.8)', '&:hover': { background: 'rgba(255,0,0,0.1)' } }}>
          <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}><LogoutIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Déconnexion" primaryTypographyProps={{ fontSize: '0.82rem' }} />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f0f2f5' }}>
      {/* Sidebar */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 'none' } }}
        >
          {drawer}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerOpen ? DRAWER_WIDTH : 0,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH, border: 'none',
              transition: 'width 0.2s',
              overflow: 'hidden'
            }
          }}
          open={drawerOpen}
        >
          {drawer}
        </Drawer>
      )}

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* AppBar */}
        <AppBar position="sticky" elevation={0} sx={{
          bgcolor: '#fff', borderBottom: '1px solid #e0e0e0',
          color: 'text.primary'
        }}>
          <Toolbar sx={{ gap: 1 }}>
            <Tooltip title={drawerOpen ? "Réduire le menu" : "Ouvrir le menu"}>
              <IconButton onClick={() => setDrawerOpen(!drawerOpen)} edge="start">
                <MenuIcon />
              </IconButton>
            </Tooltip>

            {/* Breadcrumb dynamique */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="body1" fontWeight={600} sx={{ color: '#1a237e' }}>
                {menuItems.find(m => !('divider' in m) && location.pathname.startsWith(m.path || ''))?.label || 'Super Administration'}
              </Typography>
            </Box>

            {/* User menu */}
            <Tooltip title="Mon compte">
              <IconButton onClick={handleMenuOpen}>
                <Avatar sx={{ width: 34, height: 34, bgcolor: '#1a237e', fontSize: '0.85rem' }}>
                  {user?.full_name?.[0] || 'S'}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
              <MenuItem disabled>
                <PersonIcon sx={{ mr: 1, fontSize: 18 }} />
                <Typography variant="body2">{user?.full_name}</Typography>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                <LogoutIcon sx={{ mr: 1, fontSize: 18 }} />
                Déconnexion
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Page Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, md: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default SuperAdminLayout;
