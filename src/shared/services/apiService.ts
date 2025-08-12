import { supabase } from './supabaseClient';
import { Place, TradeArea, HomeZipcodes, Location } from '../types';

class ApiService {
  async getAllPlaces(): Promise<Place[]> {
    try {
      const allPlaces: any[] = [];
      const pageSize = 1000;
      let hasMore = true;
      let page = 0;

      while (hasMore) {
        const start = page * pageSize;
        const end = start + pageSize - 1;

        const { data, error } = await supabase
          .from('places')
          .select('*')
          .range(start, end)
          .order('name');

        if (error) throw error;

        if (data && data.length > 0) {
          allPlaces.push(...data);
          
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }
      return allPlaces.map(place => ({
        id: place.id,
        name: place.name,
        street_address: place.street_address,
        city: place.city,
        state: place.state,
        logo: place.logo,
        longitude: place.longitude,
        latitude: place.latitude,
        sub_category: place.sub_category,
        isTradeAreaAvailable: place.istradeareaavailable,
        isHomeZipcodesAvailable: place.ishomezipcodesavailable,
        ismyplace: place.ismyplace
      }));
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

      if (!data) return null;

      return {
        id: data.id,
        name: data.name,
        street_address: data.street_address,
        city: data.city,
        state: data.state,
        logo: data.logo,
        longitude: data.longitude,
        latitude: data.latitude,
        sub_category: data.sub_category,
        isTradeAreaAvailable: data.istradeareaavailable,
        isHomeZipcodesAvailable: data.ishomezipcodesavailable,
        ismyplace: data.ismyplace
      };
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
      const { data, error } = await supabase
        .from('trade_areas')
        .select('*')
        .eq('pid', placeId);

      if (error) {
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }
      
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

      return validTradeAreas.length > 0 ? validTradeAreas : null;
      
    } catch (error) {
      console.error('Error fetching trade area data:', error);
      return null;
    }
  }

  async getHomeZipcodesData(placeId: string): Promise<HomeZipcodes | null> {
    try {
      const { data, error } = await supabase
        .from('home_zipcodes')
        .select('*')
        .eq('place_id', placeId)
        .single();

      if (error) {
        return null;
      }

      if (!data || !data.locations) {
        return null;
      }

      let locations = data.locations;
      
      // Handle different data formats from import
      if (typeof locations === 'string') {
        try {
          locations = JSON.parse(locations);
        } catch (e) {
          return null;
        }
      }


      const locationsArray: Location[] = [];
      
      if (Array.isArray(locations)) {
       
        locationsArray.push(...locations);
      } else if (locations && typeof locations === 'object') {
       
        for (const [zipcodeId, percentage] of Object.entries(locations)) {
          const numericPercentage = typeof percentage === 'string' ? parseFloat(percentage) : Number(percentage);
          if (!isNaN(numericPercentage)) {
            locationsArray.push({ [zipcodeId]: numericPercentage });
          }
        }
      }

      return {
        place_id: data.place_id,
        locations: locationsArray
      };
      
    } catch (error) {
      console.error('Error fetching home zipcode data:', error);
      return null;
    }
  }

  async getZipcodesPolygons(zipcodeIds: string[]): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('zipcodes')
        .select('id, polygon')
        .in('id', zipcodeIds);

      if (error) {
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }
      
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

      return validZipcodes;
      
    } catch (error) {
      console.error('Error fetching zipcode polygons:', error);
      return [];
    }
  }
}

export const apiService = new ApiService();