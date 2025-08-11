import React, { useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import AppLayout from './shared/components/layout/AppLayout';
import LeftSidebar from './features/controls/components/LeftSidebar';
import RightSidebar from './features/legend/components/RightSidebar';
import MapContainer from './features/map/components/MapContainer';
import ErrorBoundary from './shared/components/common/ErrorBoundary';
import { useMapStore } from './store/useMapStore';
import { apiService } from './shared/services/apiService';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
    background: { default: '#fafafa' }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500
        }
      }
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          '&:before': { display: 'none' },
          boxShadow: 'none',
          border: '1px solid #e0e0e0'
        }
      }
    }
  }
});

const App: React.FC = () => {
  const { setPlaces, setMyPlace, setPlacesLoading, setViewState } = useMapStore();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setPlacesLoading(true);
        
        // Load all places
        const places = await apiService.getAllPlaces();
        setPlaces(places);

        // Set my place and center map on it
        const myPlace = await apiService.getMyPlace();
        if (myPlace) {
          setMyPlace(myPlace);
          setViewState({
            longitude: myPlace.longitude,
            latitude: myPlace.latitude,
            zoom: 11
          });
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setPlacesLoading(false);
      }
    };

    initializeApp();
  }, [setPlaces, setMyPlace, setPlacesLoading, setViewState]);

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppLayout
          leftSidebar={<LeftSidebar />}
          rightSidebar={<RightSidebar />}
        >
          <MapContainer />
        </AppLayout>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;