import { IconLayer, PolygonLayer } from '@deck.gl/layers';
import type { Place, TradeArea, LayerConfig } from '../../../shared/types';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
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


function extractPolygonCoordinates(polygon: any): number[][] {
  if (!polygon || typeof polygon !== 'object') {
    return [];
  }

  let coords = polygon.coordinates;
  

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
  

  if (polygon.type === 'MultiPolygon') {
    if (coords.length > 0 && Array.isArray(coords[0]) && coords[0].length > 0) {
      return coords[0][0] || [];
    }
  }
  
  if (polygon.type === 'Polygon') {
    if (coords.length > 0 && Array.isArray(coords[0])) {
      return coords[0] || [];
    }
  }
  
  if (Array.isArray(coords) && coords.length > 0) {
    if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
      return coords[0];
    }
    if (Array.isArray(coords[0]) && typeof coords[0][0] === 'number') {
      return coords;
    }
  }
  
  return [];
}
function validatePolygonCoordinates(coords: number[][]): number[][] {
  if (!Array.isArray(coords) || coords.length < 3) {
    return [];
  }
  

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
  

  const first = validCoords[0];
  const last = validCoords[validCoords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    validCoords.push([first[0], first[1]]);
  }
  
  return validCoords;
}

export const TRADE_AREA_COLORS: [number, number, number][] = [
  [255, 99, 71],
  [54, 162, 235],
  [75, 192, 192],
  [255, 206, 84],
  [153, 102, 255],
  [255, 159, 64],
  [199, 199, 199],
  [83, 102, 255],
  [255, 99, 132],
  [54, 235, 162]
];

export const HOME_ZIPCODE_COLORS: [number, number, number][] = [
  [255, 206, 84],
  [255, 159, 64],
  [255, 99, 132],
  [153, 102, 255],
  [201, 203, 207]
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

  if (config.showHomeZipcodes !== false) {
    const homeZipcodeLayers = config.activeLayers.filter(layer => 
      layer.type === 'home-zipcodes' && layer.visible && layer.data
    );

    homeZipcodeLayers.forEach((layer) => {
      if (!layer.data || !Array.isArray(layer.data)) {
        return;
      }

      
      const percentages = layer.data
        .map((d: any) => Number(d.percentage))
        .filter((p: number) => !isNaN(p))
        .sort((a: number, b: number) => a - b);
      
      if (percentages.length === 0) return;

      const getPercentile = (p: number) => {
        const index = Math.ceil((p / 100) * percentages.length) - 1;
        return percentages[Math.max(0, Math.min(index, percentages.length - 1))];
      };

      // Percentile thresholds for groups: 0-20, 20-40, 40-60, 60-80, 80-100
      const thresholds = {
        p20: getPercentile(20),
        p40: getPercentile(40),
        p60: getPercentile(60),
        p80: getPercentile(80)
      };
      
      const validZipcodes = [...layer.data]
        .map((zipcode) => {
          if (!zipcode.polygon || isNaN(zipcode.percentage)) {
            return null;
          }
          
          const coords = extractPolygonCoordinates(zipcode.polygon);
          const validCoords = validatePolygonCoordinates(coords);
          
          if (validCoords.length >= 4) {
           
            let group = 0;
            if (zipcode.percentage <= thresholds.p20) group = 0;
            else if (zipcode.percentage <= thresholds.p40) group = 1;
            else if (zipcode.percentage <= thresholds.p60) group = 2;
            else if (zipcode.percentage <= thresholds.p80) group = 3;
            else group = 4;
            
            return {
              ...zipcode,
              coordinates: validCoords,
              fillColor: HOME_ZIPCODE_COLORS[group],
              percentileGroup: group
            };
          }
          return null;
        })
        .filter(Boolean);

      if (validZipcodes.length === 0) return;

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
          getFillColor: (d: any) => [...d.fillColor, 180],
          getLineColor: (d: any) => [...d.fillColor, 255],
          getLineWidth: 1
        })
      );
    });
  }


  const placesToShow: Place[] = [];
  
  if (config.myPlace) {
    placesToShow.push(config.myPlace);
  }
  if (config.filters?.showNearbyPlaces && config.myPlace) {
    const nearbyPlaces = config.places.filter(place => {
      if (place.ismyplace) return false;
      

      if (config.filters.radius) {
        const distance = calculateDistance(
          config.myPlace!.latitude,
          config.myPlace!.longitude,
          place.latitude,
          place.longitude
        );
        if (distance > config.filters.radius) return false;
      }
      

      if (config.filters.categories?.length > 0) {
        if (!config.filters.categories.includes(place.sub_category)) return false;
      }
      
      return true;
    });
    
    placesToShow.push(...nearbyPlaces);
  }
  
  
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

  return layers;
}