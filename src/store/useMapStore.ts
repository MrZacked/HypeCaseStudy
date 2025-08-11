import { create } from 'zustand';
import { ViewState, Place, LayerConfig, PlaceFilters, DataType, TradeAreaLevel } from '../shared/types';
import { config, TRADE_AREA_LEVELS } from '../shared/config';

interface MapStore {
  // Viewport state
  viewState: ViewState;
  setViewState: (viewState: ViewState) => void;

  // Places state (loaded on startup)
  places: Place[];
  myPlace: Place | null;
  selectedPlace: Place | null;
  hoveredPlace: Place | null;
  setPlaces: (places: Place[]) => void;
  setMyPlace: (place: Place) => void;
  selectPlace: (place: Place | null) => void;
  setHoveredPlace: (place: Place | null) => void;

  // Filters state (for place analysis)
  filters: PlaceFilters;
  updateFilters: (filters: Partial<PlaceFilters>) => void;

  // Layer management (for polygons loaded on-demand)
  activeLayers: LayerConfig[];
  addLayer: (layer: LayerConfig) => void;
  removeLayer: (layerId: string) => void;
  toggleLayerVisibility: (layerId: string) => void;
  clearLayersByType: (type: LayerConfig['type']) => void;
  clearAllLayers: () => void;

  // Customer analysis state
  selectedDataType: DataType;
  setSelectedDataType: (dataType: DataType) => void;
  
  // Trade area levels with proper defaults
  tradeAreaLevels: TradeAreaLevel[];
  updateTradeAreaLevel: (level: number, selected: boolean) => void;
  setAllTradeAreaLevels: (selected: boolean) => void;

  // UI state
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;

  // Loading states
  placesLoading: boolean;
  tradeAreaLoading: boolean;
  homeZipcodesLoading: boolean;
  setPlacesLoading: (loading: boolean) => void;
  setTradeAreaLoading: (loading: boolean) => void;
  setHomeZipcodesLoading: (loading: boolean) => void;

  // Data visibility toggles
  showTradeAreas: boolean;
  showHomeZipcodes: boolean;
  toggleShowTradeAreas: () => void;
  toggleShowHomeZipcodes: () => void;
}

export const useMapStore = create<MapStore>((set, get) => ({
  // Initial viewport state
  viewState: config.defaultViewState,
  setViewState: (viewState) => set({ viewState }),

  // Places state
  places: [],
  myPlace: null,
  selectedPlace: null,
  hoveredPlace: null,
  setPlaces: (places) => set({ places }),
  setMyPlace: (place) => set({ myPlace: place }),
  selectPlace: (place) => set({ selectedPlace: place }),
  setHoveredPlace: (place) => set({ hoveredPlace: place }),

  // Filters state - default 1800m radius as specified
  filters: {
    radius: 1800,
    categories: [],
    showNearbyPlaces: false
  },
  updateFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),

  // Layer management
  activeLayers: [],
  addLayer: (layer) => set((state) => {
    // Check if max trade areas reached
    const tradeAreaLayers = state.activeLayers.filter(l => l.type === 'trade-area');
    if (layer.type === 'trade-area' && tradeAreaLayers.length >= config.maxTradeAreas) {
      console.warn('Maximum trade areas reached');
      return state;
    }

    // For home zipcodes, only allow one at a time
    if (layer.type === 'home-zipcodes') {
      const filteredLayers = state.activeLayers.filter(l => l.type !== 'home-zipcodes');
      return { activeLayers: [...filteredLayers, layer] };
    }

    // Remove existing layer with same id
    const filteredLayers = state.activeLayers.filter(l => l.id !== layer.id);
    return { activeLayers: [...filteredLayers, layer] };
  }),

  removeLayer: (layerId) => set((state) => ({
    activeLayers: state.activeLayers.filter(l => l.id !== layerId)
  })),

  toggleLayerVisibility: (layerId) => set((state) => ({
    activeLayers: state.activeLayers.map(l =>
      l.id === layerId ? { ...l, visible: !l.visible } : l
    )
  })),

  clearLayersByType: (type) => set((state) => ({
    activeLayers: state.activeLayers.filter(l => l.type !== type)
  })),

  clearAllLayers: () => set({ activeLayers: [] }),

  // Customer analysis - default to trade area
  selectedDataType: 'trade-area',
  setSelectedDataType: (dataType) => set((state) => {
    // When switching to home zipcodes, clear trade areas except My Place
    if (dataType === 'home-zipcodes') {
      const filteredLayers = state.activeLayers.filter(layer => {
        if (layer.type === 'trade-area') return false;
        if (layer.type === 'home-zipcodes' && layer.placeId !== state.myPlace?.id) return false;
        return true;
      });
      return { 
        selectedDataType: dataType,
        activeLayers: filteredLayers 
      };
    }
    return { selectedDataType: dataType };
  }),
  
  // Trade area levels - start with all selected for better UX
  tradeAreaLevels: TRADE_AREA_LEVELS.map((level, index) => ({
    level,
    selected: true, // Start with all selected
    opacity: level === 30 ? 0.3 : level === 50 ? 0.5 : 0.7
  })),
  
  updateTradeAreaLevel: (level, selected) => set((state) => ({
    tradeAreaLevels: state.tradeAreaLevels.map(tal =>
      tal.level === level ? { ...tal, selected } : tal
    )
  })),

  setAllTradeAreaLevels: (selected) => set((state) => ({
    tradeAreaLevels: state.tradeAreaLevels.map(tal => ({ ...tal, selected }))
  })),

  // UI state
  leftSidebarOpen: true,
  rightSidebarOpen: true,
  toggleLeftSidebar: () => set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen })),
  toggleRightSidebar: () => set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen })),

  // Loading states
  placesLoading: false,
  tradeAreaLoading: false,
  homeZipcodesLoading: false,
  setPlacesLoading: (loading) => set({ placesLoading: loading }),
  setTradeAreaLoading: (loading) => set({ tradeAreaLoading: loading }),
  setHomeZipcodesLoading: (loading) => set({ homeZipcodesLoading: loading }),

  // Data visibility toggles
  showTradeAreas: true,
  showHomeZipcodes: true,
  toggleShowTradeAreas: () => set((state) => ({ showTradeAreas: !state.showTradeAreas })),
  toggleShowHomeZipcodes: () => set((state) => ({ showHomeZipcodes: !state.showHomeZipcodes }))
}));