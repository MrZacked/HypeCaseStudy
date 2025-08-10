# Place & Trade Area Data Visualization

A React application for visualizing place data and trade areas using Deck.gl, Mapbox, and Supabase.

## Features

- Interactive map with place markers and trade area visualization
- Real-time filtering by radius and category
- Trade area polygon display with multiple opacity levels
- Home zipcode data visualization with percentile grouping
- Responsive sidebar layout with accordion controls
- Comprehensive legend for data interpretation

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **UI Components**: Material UI 5
- **Map Visualization**: Deck.gl + Mapbox + react-map-gl
- **Backend**: Supabase (PostgreSQL with PostGIS)
- **State Management**: Zustand
- **Testing**: Jest + React Testing Library

## Prerequisites

- Node.js 16+
- Supabase account
- Mapbox account

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd place-trade-area-visualization
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
REACT_APP_MAX_TRADE_AREAS=10
REACT_APP_DEFAULT_ZOOM=11
REACT_APP_DEFAULT_LATITUDE=40.7128
REACT_APP_DEFAULT_LONGITUDE=-74.0060
```

### 3. Database Setup

1. Create a new Supabase project
2. Enable PostGIS extension in your Supabase dashboard (Settings > Database > Extensions)
3. Run the SQL commands from `database/supabase_functions.sql` in your Supabase SQL editor

### 4. Data Import

1. Download the data files from the provided Google Drive link
2. Import the JSON data into your Supabase tables:
   - Import `places.json` to the `places` table
   - Import `trade_areas.json` to the `trade_areas` table
   - Import `zipcodes.json` to the `zipcodes` table
   - Import `home_zipcodes.json` to the `home_zipcodes` table

### 5. Run the Application

```bash
npm start
```

The application will be available at `http://localhost:3000`

## Project Structure

```
src/
├── features/
│   ├── places/           # Place-related components and logic
│   ├── trade-areas/      # Trade area visualization
│   ├── home-zipcodes/    # Home zipcode visualization
│   ├── map/              # Map container and interactions
│   ├── controls/         # Left sidebar controls
│   └── legend/           # Right sidebar legend
├── shared/
│   ├── components/       # Reusable UI components
│   ├── services/         # API and data services
│   ├── utils/            # Utility functions
│   ├── types/            # TypeScript type definitions
│   └── config/           # Application configuration
├── store/                # Zustand global state
└── App.tsx              # Main application component
```

## Key Features

### Place Analysis
- Filter places by radius from "My Place"
- Filter by sub-category
- Toggle visibility of nearby places
- Real-time map updates

### Customer Analysis
- Trade Area visualization with 30%, 50%, 70% levels
- Home Zipcode data with percentile grouping
- Multiple trade areas support (up to 10)
- Single home zipcode display

### Performance Optimizations
- Viewport-based data fetching
- Layer virtualization
- Debounced user inputs
- Optimized Supabase queries with spatial indexing
- Material UI tree-shaking

### Security Features
- Input sanitization with DOMPurify
- Supabase Row Level Security
- Environment variable validation
- XSS prevention

## Testing

Run the test suite:

```bash
npm test
```

For test coverage:

```bash
npm test -- --coverage
```

## Linting and Formatting

```bash
# Check for linting errors
npm run lint

# Fix linting errors
npm run lint:fix

# Format code
npm run format
```

## Building for Production

```bash
npm run build
```




