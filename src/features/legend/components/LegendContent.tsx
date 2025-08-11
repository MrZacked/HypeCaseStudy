import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useMapStore } from '../../../store/useMapStore';
import { TRADE_AREA_COLORS, HOME_ZIPCODE_COLORS } from '../../../shared/config';

interface LegendItemProps {
  color: [number, number, number];
  label: string;
  description?: string;
}

const LegendItem: React.FC<LegendItemProps> = ({ color, label, description }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
    <Box
      sx={{
        width: 20,
        height: 20,
        backgroundColor: `rgb(${color[0]}, ${color[1]}, ${color[2]})`,
        border: '1px solid #ccc',
        mr: 2,
        borderRadius: 1
      }}
    />
    <Box>
      <Typography variant="body2" fontWeight="medium">
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
  const { selectedDataType, activeLayers, tradeAreaLevels, myPlace, filters } = useMapStore();

  const hasActiveLayers = activeLayers.some(layer => layer.visible);
  const hasPlaces = myPlace || filters.showNearbyPlaces;

  if (!hasActiveLayers && !hasPlaces) {
    return (
      <Typography variant="body2" color="text.secondary">
        Select data to display on the map to see the legend
      </Typography>
    );
  }

  return (
    <Box>
      {/* Places Legend */}
      {hasPlaces && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Places
          </Typography>
          {myPlace && (
            <LegendItem
              color={[255, 0, 0]}
              label="My Place"
              description="Your reference location"
            />
          )}
          {filters.showNearbyPlaces && (
            <LegendItem
              color={[255, 140, 0]}
              label="Nearby Places"
              description="Places within selected radius"
            />
          )}
        </Box>
      )}

      {/* Trade Area Legend */}
      {selectedDataType === 'trade-area' && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Trade Areas
          </Typography>
          {tradeAreaLevels
            .filter(level => level.selected)
            .map((level, index) => (
              <LegendItem
                key={level.level}
                color={TRADE_AREA_COLORS[index] ? [...TRADE_AREA_COLORS[index]] : [128, 128, 128]}
                label={`${level.level}%`}
                description={
                  level.level === 30 ? 'Largest area, lowest opacity' :
                  level.level === 50 ? 'Medium area, medium opacity' :
                  'Smallest area, highest opacity'
                }
              />
            ))}
          {tradeAreaLevels.every(level => !level.selected) && (
            <Typography variant="body2" color="text.secondary">
              Select trade area levels to display
            </Typography>
          )}
        </Box>
      )}

      {/* Home Zipcodes Legend */}
      {selectedDataType === 'home-zipcodes' && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Home Zipcodes
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Percentile groups for customer locations
          </Typography>
          
          {(() => {
            // Get active home zipcode layers
            const homeZipcodeLayer = activeLayers.find(layer => 
              layer.type === 'home-zipcodes' && layer.visible && layer.data
            );
            
            if (homeZipcodeLayer && homeZipcodeLayer.data && Array.isArray(homeZipcodeLayer.data)) {
              // Calculate actual percentile ranges from data
              const data = homeZipcodeLayer.data;
              const percentages = data.map(d => d.percentage).sort((a, b) => b - a);
              
              if (percentages.length > 0) {
                const ranges: Array<{label: string; description: string}> = [];
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
            
            // Fallback to static ranges
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
          })()}
        </Box>
      )}

      {/* Active Layers Info */}
      {activeLayers.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Active Layers
          </Typography>
          {activeLayers
            .filter(layer => layer.visible)
            .map(layer => (
              <Typography key={layer.id} variant="body2" color="text.secondary">
                {layer.type === 'trade-area' ? 'Trade Area' : 
                 layer.type === 'home-zipcodes' ? 'Home Zipcodes' : 
                 'Places'} - {layer.placeId || 'General'}
              </Typography>
            ))}
        </Box>
      )}
    </Box>
  );
};

export default LegendContent;