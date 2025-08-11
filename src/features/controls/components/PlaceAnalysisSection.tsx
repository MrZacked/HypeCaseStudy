import React, { useState, useEffect } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Autocomplete from '@mui/material/Autocomplete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useMapStore } from '../../../store/useMapStore';
import { apiService } from '../../../shared/services/apiService';
import { validateNumericInput } from '../../../shared/utils/security';
import PlaceSearch from '../../../shared/components/PlaceSearch';

const PlaceAnalysisSection: React.FC = () => {
  const {
    filters,
    updateFilters,
    myPlace,
    placesLoading
  } = useMapStore();

  const [categories, setCategories] = useState<string[]>([]);
  const [radiusInput, setRadiusInput] = useState(filters.radius.toString());

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await apiService.getSubCategories();
        setCategories(cats);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };

    loadCategories();
  }, []);

  const handleRadiusChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setRadiusInput(value);

    try {
      const numericValue = validateNumericInput(value, 0, 50000);
      updateFilters({ radius: numericValue });
    } catch (error) {
      // Keep the input value but don't update the filter
    }
  };

  const handleCategoryChange = (newCategories: string[]) => {
    updateFilters({ categories: newCategories });
  };

  const handleShowNearbyPlaces = () => {
    if (!myPlace) return;
    updateFilters({ showNearbyPlaces: !filters.showNearbyPlaces });
  };

  const handleVisibilityToggle = () => {
    updateFilters({ showNearbyPlaces: !filters.showNearbyPlaces });
  };

  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">
          Place Analysis
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Shows businesses around "My Place"
          </Typography>

          {/* Quick Place Search */}
          <Box>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
              Quick Place Search
            </Typography>
            <PlaceSearch 
              placeholder="Search and jump to any place..."
              size="small"
              showCategories={true}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Search by name, address, or category to quickly navigate to any place
            </Typography>
          </Box>

          {/* Radius Filter */}
          <TextField
            label="Radius (meters)"
            type="number"
            value={radiusInput}
            onChange={handleRadiusChange}
            size="small"
            fullWidth
            inputProps={{
              min: 0,
              max: 50000,
              step: 100
            }}
            helperText="Distance from your place in meters"
          />

          {/* Sub Category Filter */}
          <Autocomplete
            multiple
            options={categories.filter(Boolean)} // Filter out undefined/null values
            value={filters.categories.filter(Boolean)} // Filter out undefined/null values
            onChange={(_, newValue) => handleCategoryChange(newValue?.filter(Boolean) || [])}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Sub Categories"
                placeholder={categories.length === 0 ? "Loading categories..." : "Select categories"}
                size="small"
              />
            )}
            renderTags={(value, getTagProps) =>
              value.filter(Boolean).map((option, index) => (
                <Chip
                  variant="outlined"
                  label={option}
                  size="small"
                  {...getTagProps({ index })}
                  key={option}
                />
              ))
            }
            limitTags={3}
            size="small"
          />

          {/* Hide/Show Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={filters.showNearbyPlaces}
                onChange={handleVisibilityToggle}
                size="small"
              />
            }
            label="Show nearby places"
          />

          {/* Show Nearby Places Button */}
          <Button
            variant="contained"
            fullWidth
            onClick={handleShowNearbyPlaces}
            disabled={!myPlace || placesLoading}
            sx={{ mt: 1 }}
          >
            {filters.showNearbyPlaces ? 'Hide Nearby Places' : 'Show Nearby Places'}
          </Button>

          {!myPlace && (
            <Typography variant="caption" color="error">
              My Place not found. Please check your data.
            </Typography>
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default PlaceAnalysisSection;