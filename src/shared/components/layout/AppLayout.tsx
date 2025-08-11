import React from 'react';
import { Box } from '@mui/material';

interface AppLayoutProps {
  leftSidebar: React.ReactNode;
  rightSidebar: React.ReactNode;
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ leftSidebar, rightSidebar, children }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Left Sidebar */}
      <Box
        sx={{
          width: 350,
          flexShrink: 0,
          borderRight: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper',
        }}
      >
        {leftSidebar}
      </Box>

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {children}
      </Box>

      {/* Right Sidebar */}
      <Box
        sx={{
          width: 300,
          flexShrink: 0,
          borderLeft: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper',
        }}
      >
        {rightSidebar}
      </Box>
    </Box>
  );
};

export default AppLayout;