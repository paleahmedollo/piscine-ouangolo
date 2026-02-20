import React from 'react';
import { Box, Toolbar } from '@mui/material';
import Sidebar from './Sidebar';
import Header from './Header';

const drawerWidth = 240;

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar />
      <Header title={title} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: `calc(100% - ${drawerWidth}px)`,
          minHeight: '100vh',
          backgroundColor: '#f5f5f5'
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
