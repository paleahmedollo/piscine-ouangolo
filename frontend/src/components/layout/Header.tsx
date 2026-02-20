import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Chip,
  Avatar,
  Divider,
  Badge,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  AccountCircle,
  Logout,
  WifiOff,
  Wifi,
  Sync as SyncIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useOfflineSync } from '../../hooks/useOfflineSync';

const drawerWidth = 240;

interface HeaderProps {
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ title = 'Tableau de bord' }) => {
  const { user, logout } = useAuth();
  const { isOnline, isSyncing, pendingCount, syncNow } = useOfflineSync();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleClose();
    await logout();
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      maitre_nageur: 'Maître-nageur',
      serveuse: 'Serveuse',
      receptionniste: 'Réceptionniste',
      gestionnaire_events: 'Gest. Événements',
      directeur: 'Directeur',
      maire: 'Maire'
    };
    return labels[role] || role;
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        width: `calc(100% - ${drawerWidth}px)`,
        ml: `${drawerWidth}px`,
        backgroundColor: 'white',
        color: 'text.primary',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}
    >
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Pending sync indicator */}
          {pendingCount > 0 && (
            <Tooltip title={`${pendingCount} transaction(s) en attente de synchronisation`}>
              <Badge badgeContent={pendingCount} color="warning">
                <IconButton
                  size="small"
                  onClick={syncNow}
                  disabled={!isOnline || isSyncing}
                >
                  {isSyncing ? (
                    <CircularProgress size={20} />
                  ) : (
                    <SyncIcon />
                  )}
                </IconButton>
              </Badge>
            </Tooltip>
          )}

          {/* Online/Offline indicator */}
          <Chip
            icon={isOnline ? <Wifi /> : <WifiOff />}
            label={isOnline ? 'En ligne' : 'Hors ligne'}
            color={isOnline ? 'success' : 'warning'}
            size="small"
            variant="outlined"
          />

          {/* User menu */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ mr: 1, textAlign: 'right' }}>
              <Typography variant="body2" fontWeight="medium">
                {user?.full_name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {getRoleLabel(user?.role || '')}
              </Typography>
            </Box>
            <IconButton
              size="large"
              onClick={handleMenu}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                {user?.full_name?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem disabled>
                <AccountCircle sx={{ mr: 1 }} />
                {user?.username}
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <Logout sx={{ mr: 1 }} />
                Déconnexion
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
