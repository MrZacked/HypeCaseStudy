import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { useMapStore } from '../../../store/useMapStore';
import PlaceAnalysisSection from './PlaceAnalysisSection';
import CustomerAnalysisSection from './CustomerAnalysisSection';

const LeftSidebar: React.FC = () => {
  const { toggleLeftSidebar } = useMapStore();

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: '1px solid #e0e0e0'
        }}
      >
        <Typography variant="h6" component="h1">
          Filters & Controls
        </Typography>
        <IconButton onClick={toggleLeftSidebar} size="small">
          <ChevronLeftIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <PlaceAnalysisSection />
        <CustomerAnalysisSection />
      </Box>
    </Box>
  );
};

export default LeftSidebar;