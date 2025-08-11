import React, { useEffect } from 'react';
import { useMapStore } from '../../store/useMapStore';

interface KeyboardShortcutsProps {
  onToggleSearch?: () => void;
}

const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ onToggleSearch }) => {
  const {
    toggleLeftSidebar,
    toggleRightSidebar,
    setSelectedDataType,
    updateFilters,
    clearAllLayers,
    myPlace,
    setViewState
  } = useMapStore();

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return;
      }

      // Check for modifier keys
      const isCtrl = event.ctrlKey || event.metaKey;
      const isShift = event.shiftKey;
      const isAlt = event.altKey;

      // Ctrl/Cmd + K: Toggle search
      if (isCtrl && event.key === 'k') {
        event.preventDefault();
        onToggleSearch?.();
        return;
      }

      // Escape: Clear all layers
      if (event.key === 'Escape') {
        event.preventDefault();
        clearAllLayers();
        return;
      }

      // Single letter shortcuts (only if no modifiers)
      if (!isCtrl && !isShift && !isAlt) {
        switch (event.key.toLowerCase()) {
          case 'l':
            event.preventDefault();
            toggleLeftSidebar();
            break;
            
          case 'r':
            event.preventDefault();
            toggleRightSidebar();
            break;
            
          case 't':
            event.preventDefault();
            setSelectedDataType('trade-area');
            break;
            
          case 'h':
            event.preventDefault();
            setSelectedDataType('home-zipcodes');
            break;
            
          case 'n':
            event.preventDefault();
            updateFilters({ showNearbyPlaces: true });
            break;
            
          case 'm':
            event.preventDefault();
            if (myPlace) {
              setViewState({
                longitude: myPlace.longitude,
                latitude: myPlace.latitude,
                zoom: 15
              });
            }
            break;
            
          case '?':
            event.preventDefault();
            // Show help modal (could be implemented later)
            console.log('Keyboard Shortcuts:');
            console.log('L - Toggle left sidebar');
            console.log('R - Toggle right sidebar');
            console.log('T - Switch to Trade Areas');
            console.log('H - Switch to Home Zipcodes');
            console.log('N - Show nearby places');
            console.log('M - Go to My Place');
            console.log('Ctrl+K - Search places');
            console.log('Esc - Clear all layers');
            console.log('? - Show this help');
            break;
        }
      }

      // Number keys for zoom levels
      if (!isCtrl && !isShift && !isAlt && /^[1-9]$/.test(event.key)) {
        event.preventDefault();
        const zoomLevel = parseInt(event.key) + 8; // Map 1-9 to zoom levels 9-17
        if (myPlace) {
          setViewState({
            longitude: myPlace.longitude,
            latitude: myPlace.latitude,
            zoom: zoomLevel
          });
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [
    toggleLeftSidebar,
    toggleRightSidebar,
    setSelectedDataType,
    updateFilters,
    clearAllLayers,
    myPlace,
    setViewState,
    onToggleSearch
  ]);

  return null; // This component doesn't render anything
};

export default KeyboardShortcuts;