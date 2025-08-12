import React, { useRef, useEffect, useState, memo } from 'react';
import { 
  Paper, 
  Typography, 
  Button, 
  Box, 
  Tooltip, 
  Chip,
  Divider,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { Place } from '../../../shared/types';
import { useMapStore } from '../../../store/useMapStore';
import { apiService } from '../../../shared/services/apiService';
import { TRADE_AREA_COLORS } from '../services/layerService';
import { config } from '../../../shared/config';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';

interface PlaceTooltipProps {
  place: Place;
  x: number;
  y: number;
  onClose: () => void;
}

const PlaceTooltip: React.FC<PlaceTooltipProps> = ({ place, x, y, onClose }) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);
  const [loadingText, setLoadingText] = useState<string>('');
  const [dataStats, setDataStats] = useState<{
    tradeAreaCount?: number;
    homeZipcodeCount?: number;
  }>({});
  
  const {
    activeLayers,
    addLayer,
    removeLayer,
    selectedDataType,
    tradeAreaLoading,
    homeZipcodesLoading,
    setTradeAreaLoading,
    setHomeZipcodesLoading
  } = useMapStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Find existing layers for this place
  const tradeAreaLayer = activeLayers.find(layer => 
    layer.type === 'trade-area' && layer.placeId === place.id
  );
  
  const homeZipcodesLayer = activeLayers.find(
    layer => layer.type === 'home-zipcodes' && layer.placeId === place.id
  );

  // Check trade area limits
  const tradeAreaLayers = activeLayers.filter(layer => layer.type === 'trade-area');
  const maxTradeAreasReached = tradeAreaLayers.length >= config.maxTradeAreas;

  const handleShowTradeArea = async () => {
    if (tradeAreaLayer) {
      removeLayer(tradeAreaLayer.id);
      setDataStats(prev => ({ ...prev, tradeAreaCount: undefined }));
      return;
    }

    if (maxTradeAreasReached) {
      return;
    }
    
    try {
      setTradeAreaLoading(true);
      setLoadingText('Fetching trade area data...');
      setLoadingProgress(0);
      
      setTimeout(() => setLoadingProgress(30), 100);
      
      const tradeAreaData = await apiService.getTradeAreaData(place.id);
      
      setLoadingProgress(70);
      
      if (tradeAreaData && tradeAreaData.length > 0) {
        setLoadingText('Processing polygons...');
        setLoadingProgress(90);
        
        // Generate unique color for this place based on hash
        const placeHash = place.id.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0);
        const colorIndex = Math.abs(placeHash) % TRADE_AREA_COLORS.length;
        
        const newLayer = {
          id: `trade-area-${place.id}`,
          type: 'trade-area' as const,
          placeId: place.id,
          placeName: place.name,
          visible: true,
          color: TRADE_AREA_COLORS[colorIndex] as [number, number, number],
          opacity: 0.6,
          timestamp: Date.now(),
          data: tradeAreaData
        };
        
        addLayer(newLayer);
        setDataStats(prev => ({ ...prev, tradeAreaCount: tradeAreaData.length }));
        setLoadingProgress(100);
      }
    } catch (error) {
      console.error('Failed to fetch trade area data:', error);

    } finally {
      setTradeAreaLoading(false);
      setLoadingProgress(null);
      setLoadingText('');
    }
  };

  const handleShowHomeZipcodes = async () => {
    if (homeZipcodesLayer) {
      removeLayer(homeZipcodesLayer.id);
      setDataStats(prev => ({ ...prev, homeZipcodeCount: undefined }));
      return;
    }
    
    try {
      setHomeZipcodesLoading(true);
      setLoadingText('Clearing previous home zipcode layers...');
      setLoadingProgress(0);
      
      // Clear other home zipcode layers (only one at a time per specification)
      activeLayers
        .filter(layer => layer.type === 'home-zipcodes')
        .forEach(layer => removeLayer(layer.id));

      setLoadingText('Fetching home zipcode data...');
      setLoadingProgress(20);
      
      const homeZipcodesData = await apiService.getHomeZipcodesData(place.id);
      
      setLoadingProgress(40);
      
      if (homeZipcodesData && homeZipcodesData.locations && Array.isArray(homeZipcodesData.locations)) {
        // Convert array of Location objects to a map for easier lookup
        const locationsMap: { [zipcodeId: string]: number } = {};
        homeZipcodesData.locations.forEach(location => {
          Object.entries(location).forEach(([zipcodeId, percentage]) => {
            const numericPercentage = typeof percentage === 'string' ? parseFloat(percentage) : Number(percentage);
            if (!isNaN(numericPercentage)) {
              locationsMap[zipcodeId] = numericPercentage;
            }
          });
        });
        
        const zipcodeIds = Object.keys(locationsMap);
        
        if (zipcodeIds.length === 0) {
          return;
        }
        
        setLoadingText(`Fetching polygons for ${zipcodeIds.length} zipcodes...`);
        setLoadingProgress(60);
        
        const zipcodesPolygons = await apiService.getZipcodesPolygons(zipcodeIds);
        
        setLoadingProgress(80);
        
        if (zipcodesPolygons && zipcodesPolygons.length > 0) {
          setLoadingText('Processing zipcode data...');
          setLoadingProgress(90);
          
          // Combine percentage data with polygon data
          const combinedData = zipcodesPolygons
            .map(zipcode => ({
              ...zipcode,
              percentage: locationsMap[zipcode.id] || 0
            }))
            .filter(zipcode => !isNaN(zipcode.percentage) && zipcode.percentage > 0)
            .sort((a, b) => b.percentage - a.percentage); // Sort by percentage descending

          if (combinedData.length > 0) {
            const newLayer = {
              id: `home-zipcodes-${place.id}`,
              type: 'home-zipcodes' as const,
              placeId: place.id,
              placeName: place.name,
              visible: true,
              color: [54, 162, 235] as [number, number, number],
              opacity: 0.6,
              timestamp: Date.now(),
              data: combinedData
            };
            
            addLayer(newLayer);
            setDataStats(prev => ({ ...prev, homeZipcodeCount: combinedData.length }));
            setLoadingProgress(100);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch home zipcode data:', error);

    } finally {
      setHomeZipcodesLoading(false);
      setLoadingProgress(null);
      setLoadingText('');
    }
  };

  // Determine button states based on actual data availability flags
  const tradeAreaAvailable = place.isTradeAreaAvailable;
  const homeZipcodesAvailable = place.isHomeZipcodesAvailable;
  
  const isTradeAreaDisabled = !tradeAreaAvailable || (maxTradeAreasReached && !tradeAreaLayer);
  const isHomeZipcodesDisabled = !homeZipcodesAvailable;



  const getTradeAreaTooltip = () => {
    if (!tradeAreaAvailable) {
      return 'Trade area data is not available for this place.';
    }
    if (maxTradeAreasReached && !tradeAreaLayer) {
      return `Maximum ${config.maxTradeAreas} trade areas can be displayed at once.`;
    }
    return tradeAreaLayer ? 'Click to hide trade area' : 'Click to show trade area';
  };

  const getHomeZipcodesTooltip = () => {
    if (!homeZipcodesAvailable) {
      return 'Home zipcode data is not available for this place.';
    }
    return homeZipcodesLayer ? 'Click to hide home zipcodes' : 'Click to show home zipcodes';
  };

  // Show buttons based on selected data type (per specification)
  const showTradeAreaButton = selectedDataType === 'trade-area';
  const showHomeZipcodesButton = selectedDataType === 'home-zipcodes';

  return (
    <Paper
      ref={tooltipRef}
      elevation={8}
      sx={{
        position: 'absolute',
        left: x + 10,
        top: y - 10,
        minWidth: 300,
        maxWidth: 360,
        zIndex: 1000,
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, backgroundColor: 'primary.main', color: 'primary.contrastText' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              {place.name}
            </Typography>
            {place.ismyplace && (
              <Chip 
                label="My Place" 
                size="small" 
                sx={{ 
                  backgroundColor: 'primary.dark',
                  color: 'primary.contrastText',
                  fontWeight: 600
                }}
              />
            )}
          </Box>
          <IconButton 
            size="small" 
            onClick={onClose}
            sx={{ color: 'primary.contrastText' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2 }}>
        {/* Location Information */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
          <LocationOnIcon fontSize="small" color="action" sx={{ mt: 0.5 }} />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {place.street_address}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {place.city}, {place.state}
            </Typography>
          </Box>
        </Box>

        {/* Category */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <BusinessIcon fontSize="small" color="action" />
          <Chip 
            label={place.sub_category} 
            size="small" 
            variant="outlined" 
            color="primary"
          />
        </Box>

        {/* Data Availability Status */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Available Data:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            <Chip
              label="Trade Areas"
              size="small"
              color={place.isTradeAreaAvailable ? "success" : "default"}
              variant={place.isTradeAreaAvailable ? "filled" : "outlined"}
            />
            <Chip
              label="Home Zipcodes"
              size="small"
              color={place.isHomeZipcodesAvailable ? "success" : "default"}
              variant={place.isHomeZipcodesAvailable ? "filled" : "outlined"}
            />
          </Box>
        </Box>

        {/* Data Statistics */}
        {(dataStats.tradeAreaCount || dataStats.homeZipcodeCount) && (
          <Box sx={{ mb: 2, p: 1, backgroundColor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              Currently Loaded:
            </Typography>
            {dataStats.tradeAreaCount && (
              <Typography variant="body2" color="primary">
                Trade Areas: {dataStats.tradeAreaCount} polygons
              </Typography>
            )}
            {dataStats.homeZipcodeCount && (
              <Typography variant="body2" color="secondary">
                Home Zipcodes: {dataStats.homeZipcodeCount} zipcodes
              </Typography>
            )}
          </Box>
        )}

        {/* Loading Progress */}
        {(tradeAreaLoading || homeZipcodesLoading) && (
          <Box sx={{ mb: 2 }}>
            <LoadingSpinner 
              variant="linear" 
              text={loadingText} 
              progress={loadingProgress || undefined}
            />
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {showTradeAreaButton && (
            <Tooltip title={getTradeAreaTooltip()} placement="top">
              <span>
                <Button
                  variant={tradeAreaLayer ? "outlined" : "contained"}
                  color={tradeAreaLayer ? "secondary" : "primary"}
                  size="small"
                  fullWidth
                  disabled={isTradeAreaDisabled || tradeAreaLoading}
                  onClick={handleShowTradeArea}
                  startIcon={tradeAreaLoading ? undefined : undefined}
                >
                  {tradeAreaLayer ? 'Hide Trade Area' : 'Show Trade Area'}
                </Button>
              </span>
            </Tooltip>
          )}

          {showHomeZipcodesButton && (
            <Tooltip title={getHomeZipcodesTooltip()} placement="top">
              <span>
                <Button
                  variant={homeZipcodesLayer ? "outlined" : "contained"}
                  color={homeZipcodesLayer ? "secondary" : "primary"}
                  size="small"
                  fullWidth
                  disabled={isHomeZipcodesDisabled || homeZipcodesLoading}
                  onClick={handleShowHomeZipcodes}
                >
                  {homeZipcodesLayer ? 'Hide Home Zipcodes' : 'Show Home Zipcodes'}
                </Button>
              </span>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default memo(PlaceTooltip);