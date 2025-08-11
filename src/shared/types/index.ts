export interface Place {
  id: string;
  name: string;
  street_address: string;
  city: string;
  state: string;
  logo: string | null;
  longitude: number;
  latitude: number;
  sub_category: string;
  istradeareaavailable: boolean;
  ishomezipcodesavailable: boolean;
  ismyplace?: boolean;
}

export interface Polygon {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][];
}

export interface Zipcode {
  id: string;
  polygon: Polygon;
}

export interface Location {
  [zipcodeId: string]: string; // Percentages are stored as strings in the database
}

export interface TradeArea {
  pid: string;
  polygon: Polygon;
  trade_area: number;
}

export interface HomeZipcodes {
  place_id: string;
  locations: Location;
}

export interface PlaceFilters {
  radius: number;
  categories: string[];
  showNearbyPlaces: boolean;
}

export interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  bearing?: number;
  pitch?: number;
}

export interface LayerConfig {
  id: string;
  type: 'places' | 'trade-area' | 'home-zipcodes';
  placeId?: string;
  placeName?: string;
  visible: boolean;
  color?: [number, number, number];
  opacity?: number;
  timestamp: number;
  data?: any; // Store the actual polygon data
}

export interface LegendItem {
  label: string;
  color: [number, number, number];
  percentage?: string;
}

export interface MapBounds {
  sw: { lat: number; lng: number };
  ne: { lat: number; lng: number };
}

export type DataType = 'trade-area' | 'home-zipcodes';

export interface TradeAreaLevel {
  level: number;
  selected: boolean;
  opacity: number;
}