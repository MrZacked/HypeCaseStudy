import React, { memo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useMapStore } from '../../../store/useMapStore';
import LegendContent from './LegendContent';
import ExportData from '../../../shared/components/ExportData';

const RightSidebar: React.FC = () => {
  const { toggleRightSidebar } = useMapStore();

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
        <IconButton onClick={toggleRightSidebar} size="small">
          <ChevronRightIcon />
        </IconButton>
        <Typography variant="h6" component="h1" sx={{ flex: 1, textAlign: 'center' }}>
          Legend
        </Typography>
        <ExportData />
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <LegendContent />
      </Box>
    </Box>
  );
};

export default memo(RightSidebar);