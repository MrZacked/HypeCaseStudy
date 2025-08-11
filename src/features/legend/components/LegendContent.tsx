import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useMapStore } from '../../../store/useMapStore';
import { TRADE_AREA_COLORS, HOME_ZIPCODE_COLORS } from '../../map/services/layerService';
import { TRADE_AREA_LEVELS } from '../../../shared/config';

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
      const percentages = data.map(d => d.percentage).sort((a, b) => b - a);
      
      if (percentages.length > 0) {
        const ranges: Array<{label: string; description: string}> = [];
        
        // Create 5 percentile groups
        for (let i = 0; i < 5; i++) {
          const startIndex = Math.floor((i / 5) * percentages.length);
          const endIndex = Math.min(Math.floor(((i + 1) / 5) * percentages.length) - 1, percentages.length - 1);
          
          const minPercent = percentages[endIndex];
          const maxPercent = percentages[startIndex];
          
          ranges.push({
            label: `${i * 20}-${(i + 1) * 20}%`,
            description: `${minPercent.toFixed(1)}%-${maxPercent.toFixed(1)}%`
          });
        }
        
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
      { label: '0-20%', description: 'High density' },
      { label: '20-40%', description: 'Medium-high density' },
      { label: '40-60%', description: 'Medium density' },
      { label: '60-80%', description: 'Low-medium density' },
      { label: '80-100%', description: 'Low density' }
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
          <LegendItem
            color={[54, 162, 235]} // Blue for nearby places
            label="Nearby Places"
            description={`Within ${filters.radius}m radius`}
          />
        )}
      </Box>

      {/* Trade Area Legend */}
      {selectedDataType === 'trade-area' && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
            Trade Areas
          </Typography>
          
          {TRADE_AREA_LEVELS.map((level, index) => {
            const isSelected = tradeAreaLevels?.find(tal => tal.level === level && tal.selected);
            
            if (!isSelected) return null;
            
            // Get description based on level (largest to smallest area)
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
                key={level}
                color={TRADE_AREA_COLORS[index % TRADE_AREA_COLORS.length]}
                label={`${level}%`}
                description={getDescription(level)}
              />
            );
          })}
          
          {activeLayers.filter(layer => layer.type === 'trade-area' && layer.visible).length === 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Click "Show Trade Area" on a place to display trade area polygons
            </Typography>
          )}
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