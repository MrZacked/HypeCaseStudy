import '@testing-library/jest-dom';

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock mapbox-gl
jest.mock('mapbox-gl', () => ({
  Map: jest.fn(),
  Marker: jest.fn(),
  Popup: jest.fn(),
}));

// Mock environment variables for tests
process.env.REACT_APP_SUPABASE_URL = 'test-url';
process.env.REACT_APP_SUPABASE_ANON_KEY = 'test-key';
process.env.REACT_APP_MAPBOX_ACCESS_TOKEN = 'test-token';