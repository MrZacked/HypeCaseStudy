import { supabase } from './supabaseClient';
import { Place, TradeArea, HomeZipcodes } from '../types';

class ApiService {
  async getAllPlaces(): Promise<Place[]> {
    try {
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching places:', error);
      return [];
    }
  }

  async getMyPlace(): Promise<Place | null> {
    try {
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('ismyplace', true)
        .single();

      if (error) {
        console.error('Error fetching my place:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching my place:', error);
      return null;
    }
  }

  async getSubCategories(): Promise<string[]> {
    try {
      const { data, error } = await supabase.rpc('get_sub_categories');
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching sub categories:', error);
      return [];
    }
  }

  async getTradeAreaData(placeId: string): Promise<TradeArea[] | null> {
    try {
      console.log('Fetching trade area data for place:', placeId);
      
      const { data, error } = await supabase
        .from('trade_areas')
        .select('*')
        .eq('pid', placeId);

      if (error) {
        console.error('Trade area query error:', error);
        return null;
      }

      if (!data || data.length === 0) {
        console.log('No trade area data found for place:', placeId);
        return null;
      }

      console.log(`Found ${data.length} trade area records for place:`, placeId);
      
      // Validate and process data
      const validTradeAreas = data
        .filter((item: any) => {
          // Check if polygon exists and has valid structure
          if (!item.polygon) {
            console.warn('Trade area missing polygon:', item);
            return false;
          }
          
          // Parse polygon if it's a string
          let polygon = item.polygon;
          if (typeof polygon === 'string') {
            try {
              polygon = JSON.parse(polygon);
            } catch (e) {
              console.warn('Invalid polygon JSON:', item);
              return false;
            }
          }
          
          // Check polygon structure
          if (!polygon.coordinates || !Array.isArray(polygon.coordinates)) {
            console.warn('Invalid polygon coordinates:', item);
            return false;
          }
          
          return true;
        })
        .map((item: any) => {
          let polygon = item.polygon;
          if (typeof polygon === 'string') {
            polygon = JSON.parse(polygon);
          }
          
          return {
            pid: item.pid,
            trade_area: parseInt(item.trade_area) || 30,
            polygon: polygon
          };
        });

      console.log(`Returning ${validTradeAreas.length} valid trade areas`);
      return validTradeAreas.length > 0 ? validTradeAreas : null;
      
    } catch (error) {
      console.error('Error fetching trade area data:', error);
      return null;
    }
  }

  async getHomeZipcodesData(placeId: string): Promise<HomeZipcodes | null> {
    try {
      console.log('Fetching home zipcode data for place:', placeId);
      
      const { data, error } = await supabase
        .from('home_zipcodes')
        .select('*')
        .eq('place_id', placeId)
        .single();

      if (error) {
        console.error('Home zipcodes query error:', error);
        return null;
      }

      if (!data) {
        console.log('No home zipcode data found for place:', placeId);
        return null;
      }

      console.log('Found home zipcode data for place:', placeId);
      
      // Validate locations data
      if (!data.locations) {
        console.warn('Home zipcode data missing locations:', data);
        return null;
      }

      let locations = data.locations;
      if (typeof locations === 'string') {
        try {
          locations = JSON.parse(locations);
        } catch (e) {
          console.warn('Invalid locations JSON:', data);
          return null;
        }
      }

      return {
        place_id: data.place_id,
        locations: locations
      };
      
    } catch (error) {
      console.error('Error fetching home zipcode data:', error);
      return null;
    }
  }

  async getZipcodesPolygons(zipcodeIds: string[]): Promise<any[]> {
    try {
      console.log('Fetching zipcode polygons for IDs:', zipcodeIds.slice(0, 5), '...');
      
      const { data, error } = await supabase
        .from('zipcodes')
        .select('id, polygon')
        .in('id', zipcodeIds);

      if (error) {
        console.error('Zipcodes query error:', error);
        return [];
      }

      if (!data || data.length === 0) {
        console.log('No zipcode polygons found');
        return [];
      }

      console.log(`Found ${data.length} zipcode polygons`);
      
      // Validate and process zipcode polygons
      const validZipcodes = data
        .filter((item: any) => {
          if (!item.polygon) {
            console.warn('Zipcode missing polygon:', item.id);
            return false;
          }
          
          let polygon = item.polygon;
          if (typeof polygon === 'string') {
            try {
              polygon = JSON.parse(polygon);
            } catch (e) {
              console.warn('Invalid zipcode polygon JSON:', item.id);
              return false;
            }
          }
          
          if (!polygon.coordinates || !Array.isArray(polygon.coordinates)) {
            console.warn('Invalid zipcode polygon coordinates:', item.id);
            return false;
          }
          
          return true;
        })
        .map((item: any) => {
          let polygon = item.polygon;
          if (typeof polygon === 'string') {
            polygon = JSON.parse(polygon);
          }
          
          return {
            id: item.id,
            polygon: polygon
          };
        });

      console.log(`Returning ${validZipcodes.length} valid zipcode polygons`);
      return validZipcodes;
      
    } catch (error) {
      console.error('Error fetching zipcode polygons:', error);
      return [];
    }
  }
}

export const apiService = new ApiService();