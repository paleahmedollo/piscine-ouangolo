import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Box,
  Typography
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Pool as PoolIcon,
  Restaurant as RestaurantIcon,
  Hotel as HotelIcon,
  Event as EventIcon,
  PointOfSale as CaisseIcon,
  People as UsersIcon,
  Assessment as ReportsIcon,
  Badge as EmployeesIcon,
  Receipt as ExpensesIcon,
  Business as BusinessIcon,
  LocalCarWash as LavageIcon,
  SportsBar as MaquisIcon,
  Store as SuperetteIcon,
  LocalLaundryService as PressingIcon,
  Warehouse as DepotIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import GestixLogo from '../GestixLogo';

const drawerWidth = 240;

interface MenuItemType {
  text: string;
  icon: React.ReactNode;
  path: string;
  module: string;
}

const menuItems: MenuItemType[] = [
  { text: 'Tableau de bord', icon: <DashboardIcon />, path: '/', module: 'dashboard' },
  { text: 'Piscine', icon: <PoolIcon />, path: '/piscine', module: 'piscine' },
  { text: 'Restaurant', icon: <RestaurantIcon />, path: '/restaurant', module: 'restaurant' },
  { text: 'Hôtel', icon: <HotelIcon />, path: '/hotel', module: 'hotel' },
  { text: 'Événements', icon: <EventIcon />, path: '/events', module: 'events' },
  { text: 'Lavage Auto', icon: <LavageIcon />, path: '/lavage', module: 'lavage' },
  { text: 'Pressing', icon: <PressingIcon />, path: '/pressing', module: 'pressing' },
  { text: 'Maquis / Bar', icon: <MaquisIcon />, path: '/maquis', module: 'maquis' },
  { text: 'Supérette', icon: <SuperetteIcon />, path: '/superette', module: 'superette' },
  { text: 'Dépôt', icon: <DepotIcon />, path: '/depot', module: 'depot' },
  { text: 'Caisse', icon: <CaisseIcon />, path: '/caisse', module: 'caisse' },
  { text: 'Mes Rapports', icon: <ReportsIcon />, path: '/reports', module: 'reports' }
];

const adminItems: MenuItemType[] = [
  { text: 'Utilisateurs', icon: <UsersIcon />, path: '/users', module: 'users' },
  { text: 'Employes & Paie', icon: <EmployeesIcon />, path: '/employees', module: 'employees' },
  { text: 'Depenses', icon: <ExpensesIcon />, path: '/expenses', module: 'expenses' },
  { text: 'Entreprises', icon: <BusinessIcon />, path: '/companies', module: 'companies' }
];

interface SidebarProps {
  mobileOpen?: boolean;
  onDrawerToggle?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onDrawerToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { canAccessModule, user } = useAuth();

  // Le super_admin ne voit QUE la gestion des entreprises
  const isSuperAdmin = user?.role === 'super_admin';
  const visibleMenuItems  = isSuperAdmin ? [] : menuItems.filter(item => canAccessModule(item.module));
  const visibleAdminItems = isSuperAdmin
    ? adminItems.filter(item => item.module === 'companies')
    : adminItems.filter(item => canAccessModule(item.module));

  const handleNavigate = (path: string) => {
    navigate(path);
    if (onDrawerToggle && mobileOpen) onDrawerToggle();
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ py: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <GestixLogo size={34} variant="white" />
          <Typography
            variant="h6"
            noWrap
            fontWeight={800}
            letterSpacing={2.5}
            sx={{ color: 'white', fontSize: '1.1rem' }}
          >
            GESTIX
          </Typography>
        </Box>
      </Toolbar>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />

      <List>
        {visibleMenuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigate(item.path)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' }
                },
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
              }}
            >
              <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {visibleAdminItems.length > 0 && (
        <>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', mt: 2 }} />
          <Typography variant="overline" sx={{ px: 2, py: 1, color: 'rgba(255,255,255,0.7)' }}>
            Administration
          </Typography>
          <List>
            {visibleAdminItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => handleNavigate(item.path)}
                  sx={{
                    '&.Mui-selected': { backgroundColor: 'rgba(255,255,255,0.15)' },
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
                  }}
                >
                  <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </>
      )}

      <Box sx={{ flexGrow: 1 }} />

      <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          {user?.full_name}
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          {user?.role.replace(/_/g, ' ')}
        </Typography>
        {user?.role !== 'super_admin' && user?.company && (
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block' }}>
            {(user.company as { name: string }).name}
          </Typography>
        )}
        {user?.role === 'super_admin' && (
          <Typography variant="caption" sx={{ color: 'rgba(255,255,0,0.6)', display: 'block' }}>
            ★ Accès global
          </Typography>
        )}
      </Box>
    </Box>
  );

  const drawerStyles = {
    '& .MuiDrawer-paper': {
      width: drawerWidth,
      boxSizing: 'border-box',
      backgroundColor: '#1a237e',
      color: 'white'
    }
  };

  return (
    <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          ...drawerStyles
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: drawerWidth,
          flexShrink: 0,
          ...drawerStyles
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;
