import { useCallback, useEffect, useRef, useState } from 'react';

export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const useThrottle = <T extends unknown[]>(
  callback: (...args: T) => void,
  delay: number
) => {
  const lastCallRef = useRef<number>(0);

  return useCallback(
    (...args: T) => {
      const now = Date.now();
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        callback(...args);
      }
    },
    [callback, delay]
  );
};

export const calculateViewportBounds = (
  longitude: number,
  latitude: number,
  zoom: number
) => {
  const zoomLevel = Math.pow(2, zoom);
  const deltaLng = 360 / zoomLevel;
  const deltaLat = 180 / zoomLevel;

  return {
    sw: {
      lng: longitude - deltaLng / 2,
      lat: latitude - deltaLat / 2
    },
    ne: {
      lng: longitude + deltaLng / 2,
      lat: latitude + deltaLat / 2
    }
  };
};

export const isLayerInViewport = (
  layer: { bounds?: { sw: { lng: number; lat: number }; ne: { lng: number; lat: number } } },
  viewport: { longitude: number; latitude: number; zoom: number }
) => {
  if (!layer.bounds) return true;
  
  const viewportBounds = calculateViewportBounds(
    viewport.longitude,
    viewport.latitude,
    viewport.zoom
  );

  return !(
    layer.bounds.ne.lng < viewportBounds.sw.lng ||
    layer.bounds.sw.lng > viewportBounds.ne.lng ||
    layer.bounds.ne.lat < viewportBounds.sw.lat ||
    layer.bounds.sw.lat > viewportBounds.ne.lat
  );
};