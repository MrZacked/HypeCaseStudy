interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  mapboxToken: string;
  maxTradeAreas: number;
  defaultViewState: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
}

const validateEnvVar = (name: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const config: AppConfig = {
  supabaseUrl: validateEnvVar('REACT_APP_SUPABASE_URL', process.env.REACT_APP_SUPABASE_URL),
  supabaseAnonKey: validateEnvVar('REACT_APP_SUPABASE_ANON_KEY', process.env.REACT_APP_SUPABASE_ANON_KEY),
  mapboxToken: validateEnvVar('REACT_APP_MAPBOX_ACCESS_TOKEN', process.env.REACT_APP_MAPBOX_ACCESS_TOKEN),
  maxTradeAreas: parseInt(process.env.REACT_APP_MAX_TRADE_AREAS || '10', 10),
  defaultViewState: {
    longitude: parseFloat(process.env.REACT_APP_DEFAULT_LONGITUDE || '-74.0060'),
    latitude: parseFloat(process.env.REACT_APP_DEFAULT_LATITUDE || '40.7128'),
    zoom: parseFloat(process.env.REACT_APP_DEFAULT_ZOOM || '11')
  }
};

export const TRADE_AREA_LEVELS = [30, 50, 70] as const;
export const TRADE_AREA_COLORS = [
  [255, 99, 71],   
  [54, 162, 235],  
  [75, 192, 192]   
] as const;

export const HOME_ZIPCODE_COLORS = [
  [255, 206, 84],   
  [255, 159, 64],   
  [255, 99, 132],   
  [153, 102, 255],  
  [201, 203, 207]   
] as const;