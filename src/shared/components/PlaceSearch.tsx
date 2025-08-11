import React, { useState, useMemo, memo } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  Chip,
  InputAdornment,
  ListItem,
  ListItemText
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { Place } from '../types';
import { useMapStore } from '../../store/useMapStore';

interface PlaceSearchProps {
  onPlaceSelect?: (place: Place) => void;
  placeholder?: string;
  size?: 'small' | 'medium';
  showCategories?: boolean;
}

const PlaceSearch: React.FC<PlaceSearchProps> = ({
  onPlaceSelect,
  placeholder = "Search places...",
  size = 'small',
  showCategories = true
}) => {
  const { places, selectPlace, setViewState } = useMapStore();
  const [searchValue, setSearchValue] = useState<string>('');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  // Create searchable options with scoring
  const searchOptions = useMemo(() => {
    const allPlaces = places.map(place => ({
      ...place,
      searchText: `${place.name} ${place.street_address} ${place.city} ${place.state} ${place.sub_category}`.toLowerCase(),
      isMyPlace: place.ismyplace === true
    }));

    if (!searchValue.trim()) {
      return allPlaces.slice(0, 50); // Limit initial results
    }

    const query = searchValue.toLowerCase();
    
    return allPlaces
      .map(place => {
        let score = 0;
        
        // Name match (highest priority)
        if (place.name.toLowerCase().includes(query)) {
          score += place.name.toLowerCase().startsWith(query) ? 100 : 50;
        }
        
        // Category match
        if (place.sub_category.toLowerCase().includes(query)) {
          score += 30;
        }
        
        // Address match
        if (place.street_address.toLowerCase().includes(query)) {
          score += 20;
        }
        
        // City match
        if (place.city.toLowerCase().includes(query)) {
          score += 15;
        }
        
        // General text match
        if (place.searchText.includes(query)) {
          score += 10;
        }
        
        // Boost My Place
        if (place.ismyplace) {
          score += 200;
        }
        
        return { ...place, score };
      })
      .filter(place => place.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20); // Limit search results
  }, [places, searchValue]);

  const handlePlaceSelect = (place: Place | null) => {
    setSelectedPlace(place);
    
    if (place) {
      // Center map on selected place
      setViewState({
        longitude: place.longitude,
        latitude: place.latitude,
        zoom: 15
      });
      
      // Select the place in the store
      selectPlace(place);
      
      // Call external handler
      onPlaceSelect?.(place);
    }
  };

  const renderOption = (props: any, option: Place) => (
    <ListItem {...props} key={option.id}>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <LocationOnIcon 
          sx={{ 
            mr: 1, 
            color: option.ismyplace ? 'error.main' : 'text.secondary',
            fontSize: 20 
          }} 
        />
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: option.ismyplace ? 600 : 400 }}>
                {option.name}
              </Typography>
              {option.ismyplace && (
                <Chip 
                  label="My Place" 
                  size="small" 
                  color="error" 
                  variant="outlined"
                />
              )}
            </Box>
          }
          secondary={
            <>
              <span style={{ display: 'block' }}>
                {option.street_address}, {option.city}, {option.state}
              </span>
              {showCategories && (
                <span style={{ display: 'block', color: '#1976d2' }}>
                  {option.sub_category}
                </span>
              )}
            </>
          }
        />
      </Box>
    </ListItem>
  );

  return (
    <Autocomplete
      value={selectedPlace}
      onChange={(_, newValue) => handlePlaceSelect(newValue)}
      inputValue={searchValue}
      onInputChange={(_, newValue) => setSearchValue(newValue)}
      options={searchOptions}
      getOptionLabel={(option) => option.name}
      renderOption={renderOption}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder}
          size={size}
          fullWidth
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      )}
      ListboxProps={{
        style: {
          maxHeight: 300,
        },
      }}
      noOptionsText={
        searchValue.trim() 
          ? `No places found for "${searchValue}"`
          : "Start typing to search places..."
      }
      isOptionEqualToValue={(option, value) => option.id === value.id}
      filterOptions={(x) => x} 
    />
  );
};

export default memo(PlaceSearch);