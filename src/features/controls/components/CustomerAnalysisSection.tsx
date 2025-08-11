import React from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Checkbox from '@mui/material/Checkbox';
import FormGroup from '@mui/material/FormGroup';
import Box from '@mui/material/Box';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useMapStore } from '../../../store/useMapStore';
import { DataType } from '../../../shared/types';
import { TRADE_AREA_LEVELS } from '../../../shared/config';

const CustomerAnalysisSection: React.FC = () => {
  const {
    selectedDataType,
    setSelectedDataType,
    tradeAreaLevels,
    updateTradeAreaLevel,
    activeLayers,
    removeLayer,
    myPlace,
    showTradeAreas,
    showHomeZipcodes,
    toggleShowTradeAreas,
    toggleShowHomeZipcodes
  } = useMapStore();

  const handleDataTypeChange = (event: any) => {
    const newDataType = event.target.value as DataType;
    setSelectedDataType(newDataType);
    
    // Specification: When user selects Home Zipcodes, only "My Place" home zipcode data should remain visible
    if (newDataType === 'home-zipcodes') {
      // Clear all trade area layers
      activeLayers
        .filter(layer => layer.type === 'trade-area')
        .forEach(layer => removeLayer(layer.id));
        
      // Keep only "My Place" home zipcode layers, remove others
      activeLayers
        .filter(layer => layer.type === 'home-zipcodes' && layer.placeId !== myPlace?.id)
        .forEach(layer => removeLayer(layer.id));
    }
  };

  const handleTradeAreaLevelChange = (level: number, checked: boolean) => {
    updateTradeAreaLevel(level, checked);
  };

  const handleVisibilityToggle = () => {
    if (selectedDataType === 'trade-area') {
      toggleShowTradeAreas();
    } else {
      toggleShowHomeZipcodes();
    }
  };

  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">
          Customer Analysis
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Shows where customers are coming from, presented using percentile data
          </Typography>

          {/* Data Type Selection */}
          <FormControl fullWidth size="small">
            <InputLabel>Data Type</InputLabel>
            <Select
              value={selectedDataType}
              label="Data Type"
              onChange={handleDataTypeChange}
            >
              <MenuItem value="trade-area">Trade Area</MenuItem>
              <MenuItem value="home-zipcodes">Home Zipcodes</MenuItem>
            </Select>
          </FormControl>

          {/* Trade Area Options */}
          {selectedDataType === 'trade-area' && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Trade Area Levels
              </Typography>
              <FormGroup>
                {TRADE_AREA_LEVELS.map((level) => {
                  const tradeAreaLevel = tradeAreaLevels.find(tal => tal.level === level);
                  return (
                    <FormControlLabel
                      key={level}
                      control={
                        <Checkbox
                          checked={tradeAreaLevel?.selected || false}
                          onChange={(e) => handleTradeAreaLevelChange(level, e.target.checked)}
                          size="small"
                        />
                      }
                      label={`${level}%`}
                    />
                  );
                })}
              </FormGroup>
              <Typography variant="caption" color="text.secondary">
                Select percentage levels to display trade area polygons
              </Typography>
            </Box>
          )}

          {/* Home Zipcodes Info */}
          {selectedDataType === 'home-zipcodes' && (
            <Box>
              <Typography variant="body2" color="text.secondary">
                Home zipcode data will be divided into 5 percentile groups automatically.
                Only one place's data can be shown at a time.
              </Typography>
            </Box>
          )}

          {/* Hide/Show Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={selectedDataType === 'trade-area' ? showTradeAreas : showHomeZipcodes}
                onChange={handleVisibilityToggle}
                size="small"
              />
            }
            label={`Show/Hide ${selectedDataType === 'trade-area' ? 'Trade Areas' : 'Home Zipcodes'}`}
          />
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default CustomerAnalysisSection;