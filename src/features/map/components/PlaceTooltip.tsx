import React, { useRef, useEffect } from 'react';
import { Paper, Typography, Button, Box, Tooltip } from '@mui/material';
import { Place } from '../../../shared/types';
import { useMapStore } from '../../../store/useMapStore';
import { apiService } from '../../../shared/services/apiService';
import { TRADE_AREA_COLORS } from '../services/layerService';
import { config } from '../../../shared/config';

interface PlaceTooltipProps {
  place: Place;
  x: number;
  y: number;
  onClose: () => void;
}

const PlaceTooltip: React.FC<PlaceTooltipProps> = ({ place, x, y, onClose }) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const {
    activeLayers,
    addLayer,
    removeLayer,
    selectedDataType,
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
      return;
    }

    if (maxTradeAreasReached) {
      return;
    }
    
    try {
      setTradeAreaLoading(true);
      
      const tradeAreaData = await apiService.getTradeAreaData(place.id);
      
      if (tradeAreaData && tradeAreaData.length > 0) {
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
          visible: true,
          color: TRADE_AREA_COLORS[colorIndex] as [number, number, number],
          opacity: 0.6,
          timestamp: Date.now(),
          data: tradeAreaData
        };
        
        addLayer(newLayer);
        console.log(`Added trade area layer for ${place.name} with ${tradeAreaData.length} polygons`);
      } else {
        console.log(`No valid trade area data found for ${place.name}`);
      }
    } catch (error) {
      console.error('Failed to fetch trade area data:', error);
    } finally {
      setTradeAreaLoading(false);
    }
  };

  const handleShowHomeZipcodes = async () => {
    if (homeZipcodesLayer) {
      removeLayer(homeZipcodesLayer.id);
      return;
    }
    
    try {
      setHomeZipcodesLoading(true);
      
      // Clear other home zipcode layers (only one at a time per specification)
      activeLayers
        .filter(layer => layer.type === 'home-zipcodes')
        .forEach(layer => removeLayer(layer.id));

      const homeZipcodesData = await apiService.getHomeZipcodesData(place.id);
      
      if (homeZipcodesData && homeZipcodesData.locations) {
        const zipcodeIds = Object.keys(homeZipcodesData.locations);
        
        if (zipcodeIds.length === 0) {
          console.log(`No zipcode IDs found for ${place.name}`);
          return;
        }
        
        console.log(`Fetching polygons for ${zipcodeIds.length} zipcodes`);
        const zipcodesPolygons = await apiService.getZipcodesPolygons(zipcodeIds);
        
        if (zipcodesPolygons && zipcodesPolygons.length > 0) {
          // Combine percentage data with polygon data
          const combinedData = zipcodesPolygons
            .map(zipcode => ({
              ...zipcode,
              percentage: parseFloat(homeZipcodesData.locations[zipcode.id] || '0')
            }))
            .filter(zipcode => !isNaN(zipcode.percentage) && zipcode.percentage > 0)
            .sort((a, b) => b.percentage - a.percentage); // Sort by percentage descending

          if (combinedData.length > 0) {
            const newLayer = {
              id: `home-zipcodes-${place.id}`,
              type: 'home-zipcodes' as const,
              placeId: place.id,
              visible: true,
              color: [54, 162, 235] as [number, number, number],
              opacity: 0.6,
              timestamp: Date.now(),
              data: combinedData
            };
            
            addLayer(newLayer);
            console.log(`Added home zipcodes layer for ${place.name} with ${combinedData.length} polygons`);
          } else {
            console.log(`No valid combined data for ${place.name}`);
          }
        } else {
          console.log(`No zipcode polygons found for ${place.name}`);
        }
      } else {
        console.log(`No home zipcode data found for ${place.name}`);
      }
    } catch (error) {
      console.error('Failed to fetch home zipcode data:', error);
    } finally {
      setHomeZipcodesLoading(false);
    }
  };

  // Determine button states based on actual data availability flags
  const tradeAreaAvailable = place.istradeareaavailable;
  const homeZipcodesAvailable = place.ishomezipcodesavailable;
  
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
        minWidth: 280,
        maxWidth: 320,
        padding: 2,
        zIndex: 1000,
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Typography variant="h6" gutterBottom>
        {place.name}
      </Typography>
      
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {place.street_address}
      </Typography>
      
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {place.city}, {place.state}
      </Typography>
      
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Category: {place.sub_category}
      </Typography>

      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {showTradeAreaButton && (
          <Tooltip title={getTradeAreaTooltip()} placement="top">
            <span>
              <Button
                variant={tradeAreaLayer ? "outlined" : "contained"}
                color={tradeAreaLayer ? "secondary" : "primary"}
                size="small"
                fullWidth
                disabled={isTradeAreaDisabled}
                onClick={handleShowTradeArea}
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
                disabled={isHomeZipcodesDisabled}
                onClick={handleShowHomeZipcodes}
              >
                {homeZipcodesLayer ? 'Hide Home Zipcodes' : 'Show Home Zipcodes'}
              </Button>
            </span>
          </Tooltip>
        )}
      </Box>
    </Paper>
  );
};

export default PlaceTooltip;