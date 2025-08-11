import React, { useCallback, useMemo } from 'react';
import Map from 'react-map-gl';
import DeckGL from '@deck.gl/react';

import { config } from '../../../shared/config';
import { useMapStore } from '../../../store/useMapStore';
import { createMapLayers } from '../services/layerService';
import { useMapInteractions } from '../hooks/useMapInteractions';
import PlaceTooltip from './PlaceTooltip';

const MapContainer: React.FC = () => {
  const {
    viewState,
    setViewState,
    places,
    myPlace,
    selectedPlace,
    activeLayers,
    filters,
    tradeAreaLevels,
    showTradeAreas,
    showHomeZipcodes,
    selectPlace
  } = useMapStore();

  const { handleHover, handleClick, hoveredPlace, tooltipInfo, setHoveredPlace, setTooltipInfo } = useMapInteractions();

  // Create deck.gl layers
  const layers = useMemo(() => {
    return createMapLayers({
      places,
      myPlace,
      activeLayers,
      filters,
      tradeAreaLevels,
      showTradeAreas,
      showHomeZipcodes,
      onHover: handleHover,
      onClick: handleClick
    });
  }, [places, myPlace, activeLayers, filters, tradeAreaLevels, showTradeAreas, showHomeZipcodes, handleHover, handleClick]);

  const handleViewStateChange = useCallback(
    ({ viewState: newViewState }: { viewState: any }) => {
      setViewState(newViewState);
    },
    [setViewState]
  );

  return (
    <>
      <DeckGL
        viewState={viewState}
        onViewStateChange={handleViewStateChange}
        layers={layers}
        controller={true}
        style={{ position: 'relative' }}
        onClick={handleClick}
        onHover={handleHover}
      >
        <Map
          mapStyle="mapbox://styles/mapbox/light-v10"
          mapboxAccessToken={config.mapboxToken}
          attributionControl={false}
        />
      </DeckGL>

      {/* Place Tooltip */}
      {tooltipInfo && (hoveredPlace || selectedPlace) && (
        <PlaceTooltip
          place={hoveredPlace || selectedPlace!}
          x={tooltipInfo.x}
          y={tooltipInfo.y}
          onClose={() => {
            selectPlace(null);
            setHoveredPlace(null);
            setTooltipInfo(null);
          }}
        />
      )}
    </>
  );
};

export default MapContainer;