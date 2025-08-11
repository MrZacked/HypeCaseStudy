import { IconLayer, PolygonLayer } from '@deck.gl/layers';
import type { Place, TradeArea, LayerConfig } from '../../../shared/types';

// Haversine formula for distance calculation
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

// Robust polygon coordinate extraction
function extractPolygonCoordinates(polygon: any): number[][] {
  if (!polygon || typeof polygon !== 'object') {
    return [];
  }

  let coords = polygon.coordinates;
  
  // Handle string polygons (parsed JSON)
  if (typeof polygon === 'string') {
    try {
      const parsed = JSON.parse(polygon);
      coords = parsed.coordinates;
    } catch (e) {
      return [];
    }
  }

  if (!coords || !Array.isArray(coords)) {
    return [];
  }
  
  // Handle MultiPolygon - take the first polygon
  if (polygon.type === 'MultiPolygon') {
    if (coords.length > 0 && Array.isArray(coords[0]) && coords[0].length > 0) {
      return coords[0][0] || [];
    }
  }
  
  // Handle Polygon - take the exterior ring
  if (polygon.type === 'Polygon') {
    if (coords.length > 0 && Array.isArray(coords[0])) {
      return coords[0] || [];
    }
  }
  
  // Handle direct coordinate arrays
  if (Array.isArray(coords) && coords.length > 0) {
    // If first element is an array of arrays, take the first one
    if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
      return coords[0];
    }
    // If first element is an array of numbers, use directly
    if (Array.isArray(coords[0]) && typeof coords[0][0] === 'number') {
      return coords;
    }
  }
  
  return [];
}

// Validate and clean polygon coordinates
function validatePolygonCoordinates(coords: number[][]): number[][] {
  if (!Array.isArray(coords) || coords.length < 3) {
    return [];
  }
  
  // Filter valid coordinate pairs
  const validCoords = coords.filter(coord => 
    Array.isArray(coord) && 
    coord.length >= 2 && 
    typeof coord[0] === 'number' && 
    typeof coord[1] === 'number' &&
    !isNaN(coord[0]) && 
    !isNaN(coord[1]) &&
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

// Color palettes for distinct visualization
export const TRADE_AREA_COLORS: [number, number, number][] = [
  [255, 99, 71],   // Tomato
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
  [255, 206, 84],   // High density - Yellow
  [255, 159, 64],   // Medium-high - Orange  
  [255, 99, 132],   // Medium - Pink
  [153, 102, 255],  // Low-medium - Purple
  [201, 203, 207],  // Low density - Grey
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
  
  // 1. PLACES LAYER - Following case study specification
  const placesToShow: Place[] = [];
  
  // Always show My Place
  if (config.myPlace) {
    placesToShow.push(config.myPlace);
  }
  
  // Show nearby places only when filter is enabled
  if (config.filters?.showNearbyPlaces && config.myPlace) {
    const nearbyPlaces = config.places.filter(place => {
      if (place.ismyplace) return false;
      
      // Apply radius filter
      if (config.filters.radius) {
        const distance = calculateDistance(
          config.myPlace!.latitude,
          config.myPlace!.longitude,
          place.latitude,
          place.longitude
        );
        if (distance > config.filters.radius) return false;
      }
      
      // Apply category filter
      if (config.filters.categories?.length > 0) {
        if (!config.filters.categories.includes(place.sub_category)) return false;
      }
      
      return true;
    });
    
    placesToShow.push(...nearbyPlaces);
  }
  
  // Create places layer with proper icons
  if (placesToShow.length > 0) {
    layers.push(
      new IconLayer({
        id: 'places-layer',
        data: placesToShow,
        pickable: true,
        sizeScale: 1,
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

  // 2. TRADE AREA LAYERS - On-demand polygon rendering
  if (config.showTradeAreas !== false) {
    const tradeAreaLayers = config.activeLayers.filter(layer => 
      layer.type === 'trade-area' && layer.visible && layer.data
    );



    tradeAreaLayers.forEach((layer, layerIndex) => {
      if (!layer.data || !Array.isArray(layer.data)) {
        return;
      }

      const tradeAreasByLevel = layer.data.reduce((acc: Record<number, TradeArea[]>, area: TradeArea) => {
        const level = area.trade_area || 30;
        if (!acc[level]) acc[level] = [];
        acc[level].push(area);
        return acc;
      }, {});

      Object.entries(tradeAreasByLevel).forEach(([level, areas]) => {
        const levelNum = parseInt(level);
        const typedAreas = areas as TradeArea[];
        
        const isLevelSelected = config.tradeAreaLevels?.find(
          tal => tal.level === levelNum && tal.selected
        );
        
        if (!isLevelSelected) {
          return;
        }
        
        const validPolygons = typedAreas
          .map(area => {
            const coords = extractPolygonCoordinates(area.polygon);
            const validCoords = validatePolygonCoordinates(coords);
            
            if (validCoords.length >= 4) {
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
        
        // Set opacity based on specification: 30% largest/lowest, 70% smallest/highest
        const opacity = levelNum === 30 ? 0.25 : levelNum === 50 ? 0.4 : 0.65;
        
        const baseColor = layer.color || TRADE_AREA_COLORS[layerIndex % TRADE_AREA_COLORS.length];
        
        const polygonLayer = new PolygonLayer({
          id: `trade-area-${layer.placeId}-level-${levelNum}`,
          data: validPolygons,
          pickable: false,
          stroked: true,
          filled: true,
          wireframe: false,
          lineWidthMinPixels: 1,
          getPolygon: (d: any) => d.coordinates,
          getFillColor: [...baseColor, Math.floor(opacity * 255)],
          getLineColor: [0, 0, 0, 255],
          getLineWidth: 1,
          opacity: 1,
          visible: true
        });
        

        

        layers.push(polygonLayer);
      });
    });
  }

  // 3. HOME ZIPCODE LAYERS - Percentile-based visualization
  if (config.showHomeZipcodes !== false) {
    const homeZipcodeLayers = config.activeLayers.filter(layer => 
      layer.type === 'home-zipcodes' && layer.visible && layer.data
    );

    homeZipcodeLayers.forEach((layer) => {
      if (!layer.data || !Array.isArray(layer.data)) {
        return;
      }

      // Sort by percentage for percentile calculation
      const sortedData = [...layer.data].sort((a, b) => b.percentage - a.percentage);
      
      const validZipcodes = sortedData
        .map((zipcode, index) => {
          if (!zipcode.polygon) {
            return null;
          }
          
          const coords = extractPolygonCoordinates(zipcode.polygon);
          const validCoords = validatePolygonCoordinates(coords);
          
          if (validCoords.length >= 4) {
            // Calculate percentile group (5 groups as per specification)
            const percentileGroup = Math.floor((index / sortedData.length) * 5);
            const colorIndex = Math.min(percentileGroup, 4);
            
            return {
              ...zipcode,
              coordinates: validCoords,
              fillColor: HOME_ZIPCODE_COLORS[colorIndex],
              percentileGroup: colorIndex
            };
          }
          return null;
        })
        .filter(Boolean);

      if (validZipcodes.length === 0) {
        console.warn('No valid home zipcode polygons found');
        return;
      }

      layers.push(
        new PolygonLayer({
          id: `home-zipcodes-${layer.id}`,
          data: validZipcodes,
          pickable: false,
          stroked: true,
          filled: true,
          wireframe: false,
          lineWidthMinPixels: 1,
          getPolygon: (d: any) => d.coordinates,
          getFillColor: (d: any) => [...d.fillColor, 128], // Semi-transparent
          getLineColor: (d: any) => d.fillColor,
          getLineWidth: 1,
          coordinateSystem: 0
        })
      );
    });
  }





  return layers;
}