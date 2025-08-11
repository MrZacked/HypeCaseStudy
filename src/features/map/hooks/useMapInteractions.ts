import { useState, useCallback } from 'react';
import { Place } from '../../../shared/types';
import { useMapStore } from '../../../store/useMapStore';

interface TooltipInfo {
  x: number;
  y: number;
}

export const useMapInteractions = () => {
  const [hoveredPlace, setHoveredPlace] = useState<Place | null>(null);
  const [tooltipInfo, setTooltipInfo] = useState<TooltipInfo | null>(null);
  const { selectedPlace, selectPlace } = useMapStore();

  const handleHover = useCallback((info: any) => {
    if (info.object && info.object.id) {
      // Only show hover tooltip if no place is selected (clicked)
      if (!selectedPlace) {
        setHoveredPlace(info.object);
        setTooltipInfo({ x: info.x, y: info.y });
      }
    } else if (!selectedPlace) {
      // Clear hover tooltip when mouse leaves, but keep selected tooltip
      setHoveredPlace(null);
      setTooltipInfo(null);
    }
  }, [selectedPlace]);

  const handleClick = useCallback((info: any) => {
    if (info.object && info.object.id) {
      selectPlace(info.object);
      setHoveredPlace(null); // Clear hover state when clicking
      setTooltipInfo({ x: info.x, y: info.y });
    } else {
      selectPlace(null);
      setHoveredPlace(null);
      setTooltipInfo(null);
    }
  }, [selectPlace]);

  return {
    handleHover,
    handleClick,
    hoveredPlace,
    tooltipInfo,
    setHoveredPlace,
    setTooltipInfo
  };
};