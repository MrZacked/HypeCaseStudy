import { IconLayer, PolygonLayer } from '@deck.gl/layers';
import type { Place, TradeArea, LayerConfig } from '../../../shared/types';

// Calculate distance between two points in meters (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// Extract polygon coordinates safely
function extractPolygonCoordinates(polygon: any): number[][] {
  if (!polygon || !polygon.coordinates) {
    return [];
  }

  const coords = polygon.coordinates;
  
  // Handle MultiPolygon - take first polygon
  if (polygon.type === 'MultiPolygon') {
    if (Array.isArray(coords) && coords.length > 0 && Array.isArray(coords[0])) {
      return coords[0][0] || [];
    }
  }
  
  // Handle Polygon - take exterior ring
  if (polygon.type === 'Polygon') {
    if (Array.isArray(coords) && coords.length > 0) {
      return coords[0] || [];
    }
  }
  
  // Fallback for direct coordinate arrays
  if (Array.isArray(coords)) {
    if (coords.length > 0 && Array.isArray(coords[0]) && coords[0].length >= 2) {
      return coords;
    }
    if (coords.length > 0 && Array.isArray(coords[0])) {
      return coords[0];
    }
  }
  
  return [];
}

// Validate polygon coordinates
function validatePolygonCoordinates(coords: number[][]): number[][] {
  if (!Array.isArray(coords) || coords.length < 3) {
    return [];
  }
  
  // Filter valid coordinates
  const validCoords = coords.filter(coord => 
    Array.isArray(coord) && coord.length >= 2 && 
    typeof coord[0] === 'number' && typeof coord[1] === 'number' &&
    !isNaN(coord[0]) && !isNaN(coord[1]) &&
    coord[0] >= -180 && coord[0] <= 180 &&
    coord[1] >= -90 && coord[1] <= 90
  );
  
  if (validCoords.length < 3) {
    return [];
  }
  
  // Ensure polygon is closed
  const first = validCoords[0];
  const last = validCoords[validCoords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    validCoords.push([first[0], first[1]]);
  }
  
  return validCoords;
}

// Color constants
export const TRADE_AREA_COLORS: [number, number, number][] = [
  [255, 99, 71],   // Red
  [54, 162, 235],  // Blue
  [75, 192, 192],  // Teal
  [255, 206, 84],  // Yellow
  [153, 102, 255], // Purple
  [255, 159, 64],  // Orange
  [199, 199, 199], // Grey
  [83, 102, 255],  // Indigo
  [255, 99, 132],  // Pink
  [54, 235, 162]   // Green
];

export const HOME_ZIPCODE_COLORS: [number, number, number][] = [
  [255, 206, 84],   // 0-20% - Yellow
  [255, 159, 64],   // 20-40% - Orange
  [255, 99, 132],   // 40-60% - Pink
  [153, 102, 255],  // 60-80% - Purple
  [201, 203, 207],  // 80-100% - Grey
];

interface MapLayersConfig {
  places: Place[];
  myPlace: Place | null;
  activeLayers: LayerConfig[];
  filters: any;
  tradeAreaLevels?: any[];
  showTradeAreas?: boolean;
  showHomeZipcodes?: boolean;
  onHover?: (info: any) => void;
  onClick?: (info: any) => void;
}

export function createMapLayers(config: MapLayersConfig): any[] {
  const layers: any[] = [];
  
  // 1. PLACES LAYER - Always show My Place, conditionally show nearby places
  const placesToShow: Place[] = [];
  
  // Always show My Place
  if (config.myPlace) {
    placesToShow.push(config.myPlace);
  }
  
  // Show nearby places if enabled
  if (config.filters?.showNearbyPlaces && config.myPlace) {
    const filteredPlaces = config.places.filter(place => {
      if (place.ismyplace) return false;
      
      // Apply radius filter
      const distance = calculateDistance(
        config.myPlace!.latitude,
        config.myPlace!.longitude,
        place.latitude,
        place.longitude
      );
      
      if (distance > config.filters.radius) return false;
      
      // Apply category filter
      if (config.filters.categories?.length > 0) {
        return config.filters.categories.includes(place.sub_category);
      }
      
      return true;
    });
    
    placesToShow.push(...filteredPlaces);
  }
  
  // Create places layer
  if (placesToShow.length > 0) {
    layers.push(
      new IconLayer({
        id: 'places-layer',
        data: placesToShow,
        pickable: true,
        getIcon: (d: Place) => ({
          url: d.ismyplace 
            ? 'https://img.icons8.com/color/48/map-pin.png'
            : 'https://img.icons8.com/color/48/marker.png',
          width: 48,
          height: 48,
          anchorY: 48,
        }),
        getPosition: (d: Place) => [d.longitude, d.latitude],
        getSize: (d: Place) => d.ismyplace ? 60 : 40,
        onHover: config.onHover,
        onClick: config.onClick,
      })
    );
  }

  // 2. TRADE AREA LAYERS - Only render if trade areas are enabled
  if (config.showTradeAreas !== false) {
    const tradeAreaLayers = config.activeLayers.filter(layer => 
      layer.type === 'trade-area' && layer.visible && layer.data
    );

    tradeAreaLayers.forEach((layer, layerIndex) => {
      if (!layer.data || !Array.isArray(layer.data) || layer.data.length === 0) {
        return;
      }

      // Group by trade area level
      const tradeAreasByLevel = layer.data.reduce((acc: Record<number, TradeArea[]>, area: TradeArea) => {
        if (!acc[area.trade_area]) acc[area.trade_area] = [];
        acc[area.trade_area].push(area);
        return acc;
      }, {});

      Object.entries(tradeAreasByLevel).forEach(([level, areas]) => {
        const levelNum = parseInt(level);
        const typedAreas = areas as TradeArea[];
        
        // Check if this level is selected
        const isLevelSelected = config.tradeAreaLevels?.find(tal => tal.level === levelNum && tal.selected);
        if (!isLevelSelected) {
          return;
        }
        
        // Process and validate polygons
        const validPolygons = typedAreas
          .map(area => {
            const coords = extractPolygonCoordinates(area.polygon);
            const validCoords = validatePolygonCoordinates(coords);
            
            if (validCoords.length >= 3) {
              return {
                ...area,
                coordinates: validCoords
              };
            }
            return null;
          })
          .filter(Boolean);
        
        if (validPolygons.length === 0) {
          return;
        }
        
        // Set opacity based on level (30% = largest/lowest opacity, 70% = smallest/highest opacity)
        const opacity = levelNum === 30 ? 0.3 : levelNum === 50 ? 0.5 : 0.7;
        
        // Get color for this layer
        const baseColor = layer.color || TRADE_AREA_COLORS[layerIndex % TRADE_AREA_COLORS.length];
        
        layers.push(
          new PolygonLayer({
            id: `trade-area-${layer.id}-level-${level}`,
            data: validPolygons,
            pickable: true,
            stroked: true,
            filled: true,
            wireframe: false,
            lineWidthMinPixels: 2,
            getPolygon: (d: any) => d.coordinates,
            getFillColor: [...baseColor, Math.floor(opacity * 255)],
            getLineColor: baseColor,
            getLineWidth: 2,
          })
        );
      });
    });
  }

  // 3. HOME ZIPCODE LAYERS - Only render if home zipcodes are enabled
  if (config.showHomeZipcodes !== false) {
    const homeZipcodeLayers = config.activeLayers.filter(layer => 
      layer.type === 'home-zipcodes' && layer.visible && layer.data
    );

    homeZipcodeLayers.forEach((layer) => {
      if (!layer.data || !Array.isArray(layer.data) || layer.data.length === 0) {
        return;
      }

      // Process and validate zipcode polygons
      const validZipcodes = layer.data
        .map((zipcode, index) => {
          if (!zipcode.polygon) {
            return null;
          }
          
          const coords = extractPolygonCoordinates(zipcode.polygon);
          const validCoords = validatePolygonCoordinates(coords);
          
          if (validCoords.length >= 3) {
            // Calculate percentile group for color assignment (5 groups)
            const percentileGroup = Math.floor((index / layer.data.length) * 5);
            const colorIndex = Math.min(percentileGroup, 4);
            
            return {
              ...zipcode,
              coordinates: validCoords,
              fillColor: HOME_ZIPCODE_COLORS[colorIndex],
              percentage: zipcode.percentage || 0
            };
          }
          return null;
        })
        .filter(Boolean);

      if (validZipcodes.length === 0) {
        return;
      }

      layers.push(
        new PolygonLayer({
          id: `home-zipcodes-${layer.id}`,
          data: validZipcodes,
          pickable: true,
          stroked: true,
          filled: true,
          wireframe: false,
          lineWidthMinPixels: 1,
          getPolygon: (d: any) => d.coordinates,
          getFillColor: (d: any) => [...d.fillColor, 128], // Semi-transparent
          getLineColor: (d: any) => d.fillColor,
          getLineWidth: 1,
        })
      );
    });
  }

  return layers;
}