const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');

const supabaseUrl = 'https://supktdlghgcngdfvipuz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGt0ZGxnaGdjbmdkZnZpcHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MjU0NTUsImV4cCI6MjA3MDQwMTQ1NX0.kfwBYGbXD8a9O1z4ng7SbpoxScmSvSsqZnUvp1lumnc';

const supabase = createClient(supabaseUrl, supabaseKey);

// Generate UUID v4
function generateUUID() {
  return crypto.randomUUID();
}

async function importInBatches(tableName, data, batchSize = 50) {
  console.log(`Importing ${data.length} records to ${tableName}...`);
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error } = await supabase.from(tableName).upsert(batch);
    
    if (error) {
      console.error(`Error in batch ${Math.floor(i/batchSize) + 1}:`, error);
      throw error;
    }
    
    console.log(`✅ ${tableName}: Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(data.length/batchSize)} completed`);
    
    // Small delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

async function main() {
  try {
    console.log('🚀 Starting data import...\n');

    // 1. Import My Place (mark as special)
    console.log('📍 Importing My Place...');
    const myPlaceData = JSON.parse(fs.readFileSync('./my_place.json', 'utf8'));
    const formattedMyPlace = {
      id: myPlaceData.id,
      name: myPlaceData.name || 'Unknown',
      street_address: myPlaceData.street_address || 'Unknown Address',
      city: myPlaceData.city || 'Unknown City',
      state: myPlaceData.state || 'Unknown State',
      logo: myPlaceData.logo,
      longitude: parseFloat(myPlaceData.longitude),
      latitude: parseFloat(myPlaceData.latitude),
      sub_category: myPlaceData.industry || 'Unknown Category', // Map industry -> sub_category
      istradeareaavailable: Boolean(myPlaceData.isTradeAreaAvailable),
      ishomezipcodesavailable: Boolean(myPlaceData.isHomeZipcodesAvailable),
      ismyplace: true
    };
    
    const { error: myPlaceError } = await supabase.from('places').upsert([formattedMyPlace]);
    if (myPlaceError) throw myPlaceError;
    console.log('✅ My Place imported');
    
    // Update geometries after import
    console.log('🔄 Updating PostGIS geometries...');
    const { error: geomError } = await supabase.rpc('update_geometries');
    if (geomError) console.warn('Geometry update warning:', geomError);
    console.log('✅ Geometries updated\n');

    // 2. Import Competitors
    console.log('🏢 Importing Competitors...');
    const competitorsData = JSON.parse(fs.readFileSync('./competitors.json', 'utf8'));
    const myPlaceId = formattedMyPlace.id; // Get the My Place ID to avoid duplicates
    
    // Create a mapping from original pid to new UUID
    const pidToIdMapping = {};
    
    const formattedCompetitors = competitorsData
      .filter(place => place.pid !== myPlaceId) // Skip if same ID as My Place
      .map(place => {
        const newId = generateUUID();
        pidToIdMapping[place.pid] = newId; // Store mapping
        
        return {
          id: newId,
          name: place.name || 'Unknown',
          street_address: place.street_address || 'Unknown Address',
          city: place.city || 'Unknown City',
          state: place.region || place.state || 'Unknown State', // Map region -> state
          logo: place.logo,
          longitude: parseFloat(place.longitude),
          latitude: parseFloat(place.latitude),
          sub_category: place.sub_category || 'Unknown Category',
          istradeareaavailable: Boolean(place.trade_area_activity),
          ishomezipcodesavailable: Boolean(place.home_locations_activity),
          ismyplace: false
        };
      });
    
    await importInBatches('places', formattedCompetitors, 50);
    console.log('✅ Competitors imported\n');

    // 3. Import Trade Areas
    console.log('📊 Importing Trade Areas...');
    const tradeAreasData = JSON.parse(fs.readFileSync('./trade_areas.json', 'utf8'));
    
    // Add MyPlace to the mapping
    pidToIdMapping[myPlaceId] = myPlaceId; // MyPlace keeps its original ID
    
    // Transform trade areas data - parse polygon strings and map PIDs to new IDs
    const formattedTradeAreas = tradeAreasData
      .filter(item => pidToIdMapping[item.pid]) // Only include items with valid mappings
      .map(item => ({
        id: generateUUID(),
        pid: pidToIdMapping[item.pid], // Use mapped ID
        polygon: typeof item.polygon === 'string' ? JSON.parse(item.polygon) : item.polygon,
        trade_area: item.trade_area
      }));
    
    console.log(`Filtered ${formattedTradeAreas.length} trade areas with valid place references`);
    await importInBatches('trade_areas', formattedTradeAreas, 25); // Smaller batches for large polygons
    console.log('✅ Trade Areas imported\n');

    // 4. Import Home Zipcodes
    console.log('🏠 Importing Home Zipcodes...');
    const homeZipcodesData = JSON.parse(fs.readFileSync('./home_zipcodes.json', 'utf8'));
    
    // Transform home zipcodes data - map place_id to new IDs
    const formattedHomeZipcodes = homeZipcodesData
      .filter(item => pidToIdMapping[item.place_id]) // Only include items with valid mappings
      .map(item => ({
        id: generateUUID(),
        place_id: pidToIdMapping[item.place_id], // Use mapped ID
        locations: item.locations
      }));
    
    console.log(`Filtered ${formattedHomeZipcodes.length} home zipcode records with valid place references`);
    await importInBatches('home_zipcodes', formattedHomeZipcodes, 50);
    console.log('✅ Home Zipcodes imported\n');

    // 5. Import Zipcodes
    console.log('📮 Importing Zipcodes...');
    const zipcodesData = JSON.parse(fs.readFileSync('./zipcodes.json', 'utf8'));
    
    // Transform zipcodes data - parse polygon strings to JSON objects
    const formattedZipcodes = zipcodesData.map(item => ({
      id: item.id,
      polygon: typeof item.polygon === 'string' ? JSON.parse(item.polygon) : item.polygon
    }));
    
    await importInBatches('zipcodes', formattedZipcodes, 25); // Smaller batches for polygons
    console.log('✅ Zipcodes imported\n');

    console.log('🔄 Final geometry update...');
    const { error: finalGeomError } = await supabase.rpc('update_geometries');
    if (finalGeomError) console.warn('Final geometry update warning:', finalGeomError);
    
    console.log('🎉 ALL DATA IMPORTED SUCCESSFULLY!');
    console.log('\n📊 Summary:');
    console.log(`- Places: ${1 + competitorsData.length} records`);
    console.log(`- Trade Areas: ${tradeAreasData.length} records`);
    console.log(`- Home Zipcodes: ${homeZipcodesData.length} records`);
    console.log(`- Zipcodes: ${zipcodesData.length} records`);

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  }
}

main();