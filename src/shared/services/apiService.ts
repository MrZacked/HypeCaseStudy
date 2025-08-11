import { supabase } from './supabaseClient';
import { Place, TradeArea, HomeZipcodes, MapBounds } from '../types';

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
      throw new Error('Failed to fetch places');
    }
  }

  async getPlacesInBounds(bounds: MapBounds, filters?: { radius?: number; categories?: string[] }): Promise<Place[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_places_in_viewport', {
          min_lat: bounds.sw.lat,
          min_lng: bounds.sw.lng,
          max_lat: bounds.ne.lat,
          max_lng: bounds.ne.lng,
          radius_filter: filters?.radius || null,
          category_filter: filters?.categories || null
        });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching places in bounds:', error);
      throw new Error('Failed to fetch places in viewport');
    }
  }

  async getMyPlace(): Promise<Place | null> {
    try {
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('ismyplace', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error fetching my place:', error);
      return null;
    }
  }

  async getTradeAreaData(placeId: string): Promise<TradeArea[]> {
    try {
      const { data, error } = await supabase
        .from('trade_areas')
        .select('*')
        .eq('pid', placeId);

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching trade area data:', error);
      return [];
    }
  }

  async getHomeZipcodesData(placeId: string): Promise<HomeZipcodes | null> {
    try {
      const { data, error } = await supabase
        .from('home_zipcodes')
        .select('*')
        .eq('place_id', placeId)
        .single();

      if (error && error.code !== 'PGRST116') {
        return null;
      }
      
      return data || null;
    } catch (error) {
      console.error('Error fetching home zipcodes data:', error);
      return null;
    }
  }

  async getZipcodesPolygons(zipcodeIds: string[]): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('zipcodes')
        .select('id, polygon')
        .in('id', zipcodeIds);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching zipcode polygons:', error);
      throw new Error('Failed to fetch zipcode polygons');
    }
  }

  async getSubCategories(): Promise<string[]> {
    try {
      // Try using the PostGIS function first
      const { data, error } = await supabase.rpc('get_sub_categories');
      
      if (error) {
        // Fallback to direct query
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('places')
          .select('sub_category')
          .not('sub_category', 'is', null);
        
        if (fallbackError) throw fallbackError;
        
        const categories = Array.from(new Set(fallbackData?.map((item: any) => item.sub_category) || []));
        return categories.sort();
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }
}

export const apiService = new ApiService();