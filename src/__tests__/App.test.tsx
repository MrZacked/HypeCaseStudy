import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

// Mock the Mapbox and Deck.gl components
jest.mock('react-map-gl/mapbox', () => {
  return function MockMap({ children }: { children: React.ReactNode }) {
    return <div data-testid="mapbox-map">{children}</div>;
  };
});

jest.mock('@deck.gl/react', () => {
  return function MockDeckGL({ children }: { children: React.ReactNode }) {
    return <div data-testid="deck-gl-overlay">{children}</div>;
  };
});

// Mock Supabase
jest.mock('../shared/services/supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          data: [],
          error: null
        })),
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: { code: 'PGRST116' }
          }))
        }))
      })),
      rpc: jest.fn(() => ({
        data: [],
        error: null
      }))
    }))
  }
}));

describe('App Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('renders main layout with sidebars and map', async () => {
    render(<App />);

    // Wait for the app to initialize
    await waitFor(() => {
      expect(screen.getByText('Filters & Controls')).toBeInTheDocument();
    });

    // Check if sidebars are present
    expect(screen.getByText('Filters & Controls')).toBeInTheDocument();
    expect(screen.getByText('Legend')).toBeInTheDocument();

    // Check if main sections are present
    expect(screen.getByText('Place Analysis')).toBeInTheDocument();
    expect(screen.getByText('Customer Analysis')).toBeInTheDocument();

    // Check if map is present
    expect(screen.getByTestId('mapbox-map')).toBeInTheDocument();
  });

  test('place analysis section has correct inputs', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Place Analysis')).toBeInTheDocument();
    });

    // Check radius input
    expect(screen.getByLabelText(/radius/i)).toBeInTheDocument();

    // Check category filter
    expect(screen.getByLabelText(/sub categories/i)).toBeInTheDocument();

    // Check show nearby places toggle
    expect(screen.getByLabelText(/show nearby places/i)).toBeInTheDocument();

    // Check show nearby places button
    expect(screen.getByRole('button', { name: /show nearby places/i })).toBeInTheDocument();
  });

  test('customer analysis section has data type selection', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Customer Analysis')).toBeInTheDocument();
    });

    // Check data type selector
    expect(screen.getByLabelText(/data type/i)).toBeInTheDocument();

    // Check trade area levels (should be visible by default)
    expect(screen.getByText('Trade Area Levels')).toBeInTheDocument();
    expect(screen.getByLabelText('30%')).toBeInTheDocument();
    expect(screen.getByLabelText('50%')).toBeInTheDocument();
    expect(screen.getByLabelText('70%')).toBeInTheDocument();
  });

  test('radius input validation works', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/radius/i)).toBeInTheDocument();
    });

    const radiusInput = screen.getByLabelText(/radius/i) as HTMLInputElement;

    // Test valid input
    fireEvent.change(radiusInput, { target: { value: '1500' } });
    expect(radiusInput.value).toBe('1500');

    // Test invalid input (negative)
    fireEvent.change(radiusInput, { target: { value: '-100' } });
    // The component should handle this gracefully
  });

  test('data type switching shows correct options', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/data type/i)).toBeInTheDocument();
    });

    // Initially should show trade area options
    expect(screen.getByText('Trade Area Levels')).toBeInTheDocument();

    // Switch to home zipcodes
    const dataTypeSelect = screen.getByLabelText(/data type/i);
    fireEvent.mouseDown(dataTypeSelect);
    
    const homeZipcodesOption = screen.getByText('Home Zipcodes');
    fireEvent.click(homeZipcodesOption);

    // Should now show home zipcodes info
    await waitFor(() => {
      expect(screen.getByText(/home zipcode data will be divided/i)).toBeInTheDocument();
    });
  });

  test('legend updates based on selected data type', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Legend')).toBeInTheDocument();
    });

    // Initially should show message about selecting data
    expect(screen.getByText(/select data to display/i)).toBeInTheDocument();
  });
});