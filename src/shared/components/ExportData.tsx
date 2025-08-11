import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography
} from '@mui/material';
import GetAppIcon from '@mui/icons-material/GetApp';
import ImageIcon from '@mui/icons-material/Image';
import TableChartIcon from '@mui/icons-material/TableChart';
import ShareIcon from '@mui/icons-material/Share';
import { useMapStore } from '../../store/useMapStore';

interface ExportDataProps {
  mapRef?: any; // Reference to the map component for screenshot
}

const ExportData: React.FC<ExportDataProps> = ({ mapRef }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { activeLayers, filters, myPlace, viewState } = useMapStore();

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const exportToJSON = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      myPlace,
      viewState,
      filters,
      activeLayers: activeLayers.map(layer => ({
        id: layer.id,
        type: layer.type,
        placeId: layer.placeId,
        placeName: layer.placeName,
        visible: layer.visible,
        color: layer.color,
        dataCount: Array.isArray(layer.data) ? layer.data.length : 0
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `place-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    handleClose();
  };

  const exportToCSV = () => {
    if (activeLayers.length === 0) {
      alert('No data to export. Please load some trade areas or home zipcodes first.');
      return;
    }

    let csvContent = 'Type,Place Name,Place ID,Data Count,Visible\n';
    
    activeLayers.forEach(layer => {
      csvContent += [
        layer.type,
        layer.placeName || 'Unknown',
        layer.placeId || '',
        Array.isArray(layer.data) ? layer.data.length : 0,
        layer.visible
      ].join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `place-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    handleClose();
  };

  const shareCurrentView = async () => {
    const shareData = {
      myPlaceId: myPlace?.id,
      viewState,
      filters,
      selectedLayers: activeLayers.map(l => ({ id: l.id, type: l.type, placeId: l.placeId }))
    };

    const shareUrl = `${window.location.origin}${window.location.pathname}#${btoa(JSON.stringify(shareData))}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Place & Trade Area Analysis',
          text: 'Check out this place analysis view',
          url: shareUrl
        });
      } catch (err) {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareUrl);
        alert('Share URL copied to clipboard!');
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert('Share URL copied to clipboard!');
    }
    
    handleClose();
  };

  const takeScreenshot = () => {
    if (mapRef?.current) {
      // This would require additional implementation with html2canvas or similar
      alert('Screenshot feature would be implemented with html2canvas library');
    } else {
      alert('Map reference not available for screenshot');
    }
    handleClose();
  };

  const hasData = activeLayers.length > 0;

  return (
    <Box>
      <Button
        variant="outlined"
        startIcon={<GetAppIcon />}
        onClick={handleClick}
        size="small"
      >
        Export
      </Button>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { minWidth: 200 }
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Export Options
          </Typography>
        </Box>
        
        <Divider />
        
        <MenuItem onClick={exportToJSON}>
          <ListItemIcon>
            <TableChartIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="Export as JSON"
            secondary="Complete data export"
          />
        </MenuItem>
        
        <MenuItem onClick={exportToCSV} disabled={!hasData}>
          <ListItemIcon>
            <TableChartIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="Export as CSV"
            secondary="Layer summary"
          />
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={shareCurrentView}>
          <ListItemIcon>
            <ShareIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="Share Current View"
            secondary="Generate shareable link"
          />
        </MenuItem>
        
        <MenuItem onClick={takeScreenshot}>
          <ListItemIcon>
            <ImageIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="Take Screenshot"
            secondary="Save map as image"
          />
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ExportData;