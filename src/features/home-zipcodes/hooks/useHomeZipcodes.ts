import { useState, useCallback } from 'react';
import { HomeZipcodes } from '../../../shared/types';
import { apiService } from '../../../shared/services/apiService';
import { useMapStore } from '../../../store/useMapStore';

export const useHomeZipcodes = () => {
  const [homeZipcodesData, setHomeZipcodesData] = useState<Record<string, HomeZipcodes>>({});
  const { setHomeZipcodesLoading } = useMapStore();

  const fetchHomeZipcodesData = useCallback(async (placeId: string): Promise<HomeZipcodes | null> => {
    // Return cached data if available
    if (homeZipcodesData[placeId]) {
      return homeZipcodesData[placeId];
    }

    try {
      setHomeZipcodesLoading(true);
      const data = await apiService.getHomeZipcodesData(placeId);
      
      if (data) {
        // Cache the data
        setHomeZipcodesData(prev => ({
          ...prev,
          [placeId]: data
        }));
      }

      return data;
    } catch (error) {
      console.error('Failed to fetch home zipcodes data:', error);
      throw new Error('Failed to load home zipcodes data');
    } finally {
      setHomeZipcodesLoading(false);
    }
  }, [homeZipcodesData, setHomeZipcodesLoading]);

  const clearHomeZipcodesData = useCallback((placeId?: string) => {
    if (placeId) {
      setHomeZipcodesData(prev => {
        const newData = { ...prev };
        delete newData[placeId];
        return newData;
      });
    } else {
      setHomeZipcodesData({});
    }
  }, []);

  const processHomeZipcodesForDisplay = useCallback((data: HomeZipcodes) => {
    // Convert array of Location objects to a flat map
    const locationsMap: { [zipcodeId: string]: number } = {};
    
    if (Array.isArray(data.locations)) {
      data.locations.forEach(location => {
        Object.entries(location).forEach(([zipcodeId, percentage]) => {
          locationsMap[zipcodeId] = percentage;
        });
      });
    }
    
    const values = Object.values(locationsMap).filter(val => !isNaN(val));
    
    if (values.length === 0) return [];

    // Sort values to calculate percentiles
    const sortedValues = [...values].sort((a: number, b: number) => a - b);
    const getPercentile = (p: number) => {
      const index = Math.ceil((p / 100) * sortedValues.length) - 1;
      return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
    };

    // Calculate percentile thresholds
    const thresholds = {
      p20: getPercentile(20),
      p40: getPercentile(40),
      p60: getPercentile(60),
      p80: getPercentile(80)
    };

    // Group zipcodes by percentile
    const groups = Object.entries(locationsMap).map(([zipcodeId, value]) => {
      if (isNaN(value)) return null;
      
      let group = 0;
      if (value <= thresholds.p20) group = 0;
      else if (value <= thresholds.p40) group = 1;
      else if (value <= thresholds.p60) group = 2;
      else if (value <= thresholds.p80) group = 3;
      else group = 4;

      return {
        zipcodeId,
        value,
        percentileGroup: group
      };
    }).filter(item => item !== null);

    return groups;
  }, []);

  return {
    homeZipcodesData,
    fetchHomeZipcodesData,
    clearHomeZipcodesData,
    processHomeZipcodesForDisplay
  };
};