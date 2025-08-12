import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useMapStore } from '../../../store/useMapStore';
import { TRADE_AREA_COLORS, HOME_ZIPCODE_COLORS } from '../../map/services/layerService';

interface LegendItemProps {
  color: [number, number, number];
  label: string;
  description?: string;
}

const LegendItem: React.FC<LegendItemProps> = ({ color, label, description }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
    <Box
      sx={{
        width: 16,
        height: 16,
        backgroundColor: `rgb(${color[0]}, ${color[1]}, ${color[2]})`,
        border: '1px solid rgba(0, 0, 0, 0.2)',
        borderRadius: 1,
        mr: 1,
        flexShrink: 0
      }}
    />
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {label}
      </Typography>
      {description && (
        <Typography variant="caption" color="text.secondary">
          {description}
        </Typography>
      )}
    </Box>
  </Box>
);

const LegendContent: React.FC = () => {
  const { 
    myPlace, 
    filters, 
    activeLayers, 
    selectedDataType,
    tradeAreaLevels
  } = useMapStore();

  // Show legend if My Place exists or nearby places are shown
  const showLegend = myPlace || filters.showNearbyPlaces;

  if (!showLegend) {
    return null;
  }

  // Generate dynamic home zipcode legend based on actual data
  const generateHomeZipcodeLegend = () => {
    const homeZipcodeLayer = activeLayers.find(layer =>
      layer.type === 'home-zipcodes' && layer.visible && layer.data
    );

    if (homeZipcodeLayer && homeZipcodeLayer.data && Array.isArray(homeZipcodeLayer.data)) {
      const data = homeZipcodeLayer.data;
      // Filter out undefined/null percentages and ensure they're numbers
      const validPercentages = data
        .map((d: any) => Number(d.percentage))
        .filter((p: number) => !isNaN(p))
        .sort((a: number, b: number) => a - b); // ascending for percentile math
      
      if (validPercentages.length > 0) {
        const getPercentile = (p: number) => {
          const index = Math.ceil((p / 100) * validPercentages.length) - 1;
          return validPercentages[Math.max(0, Math.min(index, validPercentages.length - 1))];
        };

        const thresholds = [
          getPercentile(20),
          getPercentile(40),
          getPercentile(60),
          getPercentile(80)
        ];

        
        const ranges: Array<{label: string; description: string}> = [
          { label: '0-20%', description: `0%–${thresholds[0].toFixed(1)}%` },
          { label: '20-40%', description: `${thresholds[0].toFixed(1)}%–${thresholds[1].toFixed(1)}%` },
          { label: '40-60%', description: `${thresholds[1].toFixed(1)}%–${thresholds[2].toFixed(1)}%` },
          { label: '60-80%', description: `${thresholds[2].toFixed(1)}%–${thresholds[3].toFixed(1)}%` },
          { label: '80-100%', description: `${thresholds[3].toFixed(1)}%+` }
        ];

        return HOME_ZIPCODE_COLORS.map((color, index) => (
          <LegendItem
            key={index}
            color={[...color]}
            label={ranges[index].label}
            description={ranges[index].description}
          />
        ));
      }
    }
    
    // Fallback to static ranges when no data
    const staticRanges = [
      { label: '0-20%', description: 'Lowest density' },
      { label: '20-40%', description: 'Low density' },
      { label: '40-60%', description: 'Medium density' },
      { label: '60-80%', description: 'High density' },
      { label: '80-100%', description: 'Highest density' }
    ];
    
    return HOME_ZIPCODE_COLORS.map((color, index) => (
      <LegendItem
        key={index}
        color={[...color]}
        label={staticRanges[index].label}
        description={staticRanges[index].description}
      />
    ));
  };

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 2, 
        backgroundColor: 'background.paper',
        maxHeight: '70vh',
        overflow: 'auto'
      }}
    >
      <Typography variant="h6" gutterBottom>
        Legend
      </Typography>

      {/* Places Legend */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
          Places
        </Typography>
        
        {myPlace && (
          <LegendItem
            color={[255, 99, 71]} // Red for My Place
            label="My Place"
            description={myPlace.name}
          />
        )}
        
        {filters.showNearbyPlaces && (
          <>
            <LegendItem
              color={[54, 162, 235]} // Blue for nearby places
              label="Nearby Places"
              description={`Within ${filters.radius}m radius`}
            />
            {(() => {
              // Calculate filtered places count
              const nearbyCount = activeLayers
                .filter(layer => layer.type === 'places')
                .reduce((count, layer) => count + (layer.data?.length || 0), 0) - 1; // Subtract My Place
                
              return nearbyCount > 0 ? (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 3, display: 'block' }}>
                  {nearbyCount} places shown
                </Typography>
              ) : null;
            })()}
          </>
        )}
      </Box>

      {/* Trade Area Legend */}
      {selectedDataType === 'trade-area' && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
            Trade Areas
          </Typography>
          
          {(() => {
            const activeTradeAreaLayers = activeLayers.filter(layer => 
              layer.type === 'trade-area' && layer.visible && layer.data
            );
            
            if (activeTradeAreaLayers.length === 0) {
              return (
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  Click "Show Trade Area" on a place to display trade area polygons
                </Typography>
              );
            }
            
            // Group layers by place
            const layersByPlace = activeTradeAreaLayers.reduce((acc, layer, layerIndex) => {
              const placeName = layer.placeName || `Place ${layer.placeId}`;
              if (!acc[placeName]) {
                acc[placeName] = [];
              }
              
              // Get levels for this layer
              const tradeAreasByLevel = layer.data.reduce((levelAcc: Record<number, any[]>, area: any) => {
                const level = area.trade_area || 30;
                if (!levelAcc[level]) levelAcc[level] = [];
                levelAcc[level].push(area);
                return levelAcc;
              }, {});
              
              Object.keys(tradeAreasByLevel).forEach(level => {
                const levelNum = parseInt(level);
                const isLevelSelected = tradeAreaLevels?.find(
                  tal => tal.level === levelNum && tal.selected
                );
                
                if (isLevelSelected) {
                  acc[placeName].push({
                    level: levelNum,
                    color: layer.color || TRADE_AREA_COLORS[layerIndex % TRADE_AREA_COLORS.length]
                  });
                }
              });
              
              return acc;
            }, {} as Record<string, Array<{level: number, color: [number, number, number]}>>);
            
            return Object.entries(layersByPlace).map(([placeName, levels]) => (
              <Box key={placeName} sx={{ mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  {placeName}
                </Typography>
                {levels.sort((a, b) => a.level - b.level).map(({ level, color }) => {
                  const getDescription = (level: number) => {
                    switch (level) {
                      case 30: return 'Largest area, lowest opacity';
                      case 50: return 'Medium area, medium opacity';
                      case 70: return 'Smallest area, highest opacity';
                      default: return '';
                    }
                  };
                  
                  return (
                    <LegendItem
                      key={`${placeName}-${level}`}
                      color={color}
                      label={`${level}%`}
                      description={getDescription(level)}
                    />
                  );
                })}
              </Box>
            ));
          })()}
        </Box>
      )}

      {/* Home Zipcodes Legend */}
      {selectedDataType === 'home-zipcodes' && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
            Home Zipcodes
          </Typography>
          
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Customer density by percentile
          </Typography>
          
          {generateHomeZipcodeLegend()}
          
          {activeLayers.filter(layer => layer.type === 'home-zipcodes' && layer.visible).length === 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Click "Show Home Zipcodes" on a place to display home zipcode polygons
            </Typography>
          )}
        </Box>
      )}

      {/* Additional Information */}
      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary">
          {selectedDataType === 'trade-area' ? 
            'Multiple trade areas can be shown simultaneously with unique colors' :
            'Only one place\'s home zipcode data can be shown at a time'
          }
        </Typography>
      </Box>
    </Paper>
  );
};

export default LegendContent;