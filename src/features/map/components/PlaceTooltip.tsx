import React, { useRef, useEffect } from 'react';
import { Paper, Typography, Button, Box } from '@mui/material';
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

  // Handle click outside to close tooltip
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

  // Check if layers exist for this place
  const tradeAreaLayer = activeLayers.find(layer => 
    layer.type === 'trade-area' && layer.placeId === place.id
  );
  
  const homeZipcodesLayer = activeLayers.find(
    layer => layer.type === 'home-zipcodes' && layer.placeId === place.id
  );

  // Check if max trade areas reached
  const tradeAreaLayers = activeLayers.filter(layer => layer.type === 'trade-area');
  const maxTradeAreasReached = tradeAreaLayers.length >= config.maxTradeAreas;

  const handleShowTradeArea = async () => {
    if (tradeAreaLayer) {
      // Remove existing layer
      removeLayer(tradeAreaLayer.id);
    } else {
      // Don't add if max reached
      if (maxTradeAreasReached) {
        return;
      }
      
      try {
        setTradeAreaLoading(true);
        
        // Fetch trade area data
        const tradeAreaData = await apiService.getTradeAreaData(place.id);
        
        if (tradeAreaData && Array.isArray(tradeAreaData) && tradeAreaData.length > 0) {
          // Validate data
          const validTradeAreas = tradeAreaData.filter(ta => 
            ta && 
            ta.polygon && 
            ta.polygon.coordinates && 
            Array.isArray(ta.polygon.coordinates) &&
            typeof ta.trade_area === 'number'
          );
          
          if (validTradeAreas.length > 0) {
            // Generate unique color for this place
            const placeHashColor = place.id.split('').reduce((a, b) => {
              a = ((a << 5) - a) + b.charCodeAt(0);
              return a & a;
            }, 0);
            const colorIndex = Math.abs(placeHashColor) % TRADE_AREA_COLORS.length;
            
            const newLayer = {
              id: `trade-area-${place.id}`,
              type: 'trade-area' as const,
              placeId: place.id,
              visible: true,
              color: TRADE_AREA_COLORS[colorIndex] as [number, number, number],
              opacity: 0.6,
              timestamp: Date.now(),
              data: validTradeAreas
            };
            addLayer(newLayer);
          }
        }
      } catch (error) {
        console.error('Failed to fetch trade area data:', error);
      } finally {
        setTradeAreaLoading(false);
      }
    }
  };

  const handleShowHomeZipcodes = async () => {
    if (homeZipcodesLayer) {
      // Remove existing layer
      removeLayer(homeZipcodesLayer.id);
    } else {
      try {
        setHomeZipcodesLoading(true);
        
        // Clear other home zipcode layers (only one at a time)
        activeLayers
          .filter(layer => layer.type === 'home-zipcodes')
          .forEach(layer => removeLayer(layer.id));

        // Fetch home zipcode data
        const homeZipcodesData = await apiService.getHomeZipcodesData(place.id);
        
        if (homeZipcodesData && homeZipcodesData.locations) {
          const zipcodeIds = Object.keys(homeZipcodesData.locations);
          
          if (zipcodeIds.length > 0) {
            const zipcodesPolygons = await apiService.getZipcodesPolygons(zipcodeIds);
            
            if (zipcodesPolygons && zipcodesPolygons.length > 0) {
              // Validate and combine data
              const combinedData = zipcodesPolygons
                .filter(zipcode => 
                  zipcode && 
                  zipcode.id && 
                  zipcode.polygon && 
                  zipcode.polygon.coordinates
                )
                .map(zipcode => ({
                  ...zipcode,
                  percentage: parseFloat(homeZipcodesData.locations[zipcode.id] || '0')
                }))
                .filter(zipcode => !isNaN(zipcode.percentage))
                .sort((a, b) => b.percentage - a.percentage);

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
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch home zipcode data:', error);
      } finally {
        setHomeZipcodesLoading(false);
      }
    }
  };

  // Button states
  const isTradeAreaDisabled = maxTradeAreasReached && !tradeAreaLayer;
  const isHomeZipcodesDisabled = false; // Always allow trying to fetch

  const getTradeAreaTooltip = () => {
    if (maxTradeAreasReached && !tradeAreaLayer) {
      return `Maximum ${config.maxTradeAreas} trade areas can be displayed at once.`;
    }
    return tradeAreaLayer ? 'Click to hide trade area' : 'Click to show trade area';
  };

  const getHomeZipcodesTooltip = () => {
    return homeZipcodesLayer ? 'Click to hide home zipcodes' : 'Click to show home zipcodes';
  };

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
        {/* Show Trade Area button only if Trade Area is selected */}
        {selectedDataType === 'trade-area' && (
          <Button
            variant={tradeAreaLayer ? "outlined" : "contained"}
            color={tradeAreaLayer ? "secondary" : "primary"}
            size="small"
            fullWidth
            disabled={isTradeAreaDisabled}
            onClick={handleShowTradeArea}
            title={getTradeAreaTooltip()}
          >
            {tradeAreaLayer ? 'Hide Trade Area' : 'Show Trade Area'}
          </Button>
        )}

        {/* Show Home Zipcodes button only if Home Zipcodes is selected */}
        {selectedDataType === 'home-zipcodes' && (
          <Button
            variant={homeZipcodesLayer ? "outlined" : "contained"}
            color={homeZipcodesLayer ? "secondary" : "primary"}
            size="small"
            fullWidth
            disabled={isHomeZipcodesDisabled}
            onClick={handleShowHomeZipcodes}
            title={getHomeZipcodesTooltip()}
          >
            {homeZipcodesLayer ? 'Hide Home Zipcodes' : 'Show Home Zipcodes'}
          </Button>
        )}
      </Box>
    </Paper>
  );
};

export default PlaceTooltip;