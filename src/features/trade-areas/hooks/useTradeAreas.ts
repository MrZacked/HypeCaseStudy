import { useState, useCallback } from 'react';
import { TradeArea } from '../../../shared/types';
import { apiService } from '../../../shared/services/apiService';
import { useMapStore } from '../../../store/useMapStore';

export const useTradeAreas = () => {
  const [tradeAreasData, setTradeAreasData] = useState<Record<string, TradeArea[]>>({});
  const { setTradeAreaLoading } = useMapStore();

  const fetchTradeAreaData = useCallback(async (placeId: string): Promise<TradeArea[]> => {
    // Return cached data if available
    if (tradeAreasData[placeId]) {
      return tradeAreasData[placeId];
    }

    try {
      setTradeAreaLoading(true);
      const data = await apiService.getTradeAreaData(placeId);
      
      // Cache the data
      setTradeAreasData(prev => ({
        ...prev,
        [placeId]: data
      }));

      return data;
    } catch (error) {
      console.error('Failed to fetch trade area data:', error);
      throw new Error('Failed to load trade area data');
    } finally {
      setTradeAreaLoading(false);
    }
  }, [tradeAreasData, setTradeAreaLoading]);

  const clearTradeAreaData = useCallback((placeId?: string) => {
    if (placeId) {
      setTradeAreasData(prev => {
        const newData = { ...prev };
        delete newData[placeId];
        return newData;
      });
    } else {
      setTradeAreasData({});
    }
  }, []);

  const getTradeAreaByLevel = useCallback((placeId: string, level: number): TradeArea | undefined => {
    const placeTradeAreas = tradeAreasData[placeId];
    return placeTradeAreas?.find(ta => ta.trade_area === level);
  }, [tradeAreasData]);

  return {
    tradeAreasData,
    fetchTradeAreaData,
    clearTradeAreaData,
    getTradeAreaByLevel
  };
};