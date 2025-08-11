import React, { memo } from 'react';
import { Box, CircularProgress, Typography, LinearProgress } from '@mui/material';

interface LoadingSpinnerProps {
  size?: number;
  text?: string;
  variant?: 'circular' | 'linear';
  progress?: number;
  fullscreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 40,
  text,
  variant = 'circular',
  progress,
  fullscreen = false
}) => {
  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        ...(fullscreen && {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 9999
        })
      }}
    >
      {variant === 'circular' ? (
        <CircularProgress 
          size={size} 
          variant={progress !== undefined ? 'determinate' : 'indeterminate'}
          value={progress}
        />
      ) : (
        <Box sx={{ width: 200 }}>
          <LinearProgress 
            variant={progress !== undefined ? 'determinate' : 'indeterminate'}
            value={progress}
          />
        </Box>
      )}
      
      {text && (
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {text}
          {progress !== undefined && ` (${Math.round(progress)}%)`}
        </Typography>
      )}
    </Box>
  );

  return content;
};

export default memo(LoadingSpinner);