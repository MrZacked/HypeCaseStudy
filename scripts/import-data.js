const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configure with your Supabase credentials
const supabaseUrl = 'https://supktdlghgcngdfvipuz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGt0ZGxnaGdjbmdkZnZpcHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MjU0NTUsImV4cCI6MjA3MDQwMTQ1NX0.kfwBYGbXD8a9O1z4ng7SbpoxScmSvSsqZnUvp1lumnc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function importData() {
  try {
    console.log('Starting data import...');

    // 1. Import My Place
    console.log('Importing my place...');
    const myPlaceData = JSON.parse(fs.readFileSync('my_place.json', 'utf8'));
    const myPlaceFormatted = {
      ...myPlaceData,
      isMyPlace: true,
      isTradeAreaAvailable: true,
      isHomeZipcodesAvailable: true
    };
    
    const { error: myPlaceError } = await supabase
      .from('places')
      .insert(myPlaceFormatted);
    
    if (myPlaceError) throw myPlaceError;
    console.log('✅ My place imported');

    // 2. Import Competitors (in batches)
    console.log('Importing competitors...');
    const competitorsData = JSON.parse(fs.readFileSync('competitors.json', 'utf8'));
    const batchSize = 100;
    
    for (let i = 0; i < competitorsData.length; i += batchSize) {
      const batch = competitorsData.slice(i, i + batchSize).map(place => ({
        ...place,
        isMyPlace: false
      }));
      
      const { error } = await supabase
        .from('places')
        .insert(batch);
      
      if (error) throw error;
      console.log(`✅ Imported competitors batch ${Math.floor(i/batchSize) + 1}`);
    }

    // 3. Import Trade Areas (in batches due to size)
    console.log('Importing trade areas...');
    const tradeAreasData = JSON.parse(fs.readFileSync('trade_areas.json', 'utf8'));
    
    for (let i = 0; i < tradeAreasData.length; i += batchSize) {
      const batch = tradeAreasData.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('trade_areas')
        .insert(batch);
      
      if (error) throw error;
      console.log(`✅ Imported trade areas batch ${Math.floor(i/batchSize) + 1}`);
    }

    // 4. Import Home Zipcodes
    console.log('Importing home zipcodes...');
    const homeZipcodesData = JSON.parse(fs.readFileSync('home_zipcodes.json', 'utf8'));
    
    const { error: homeZipcodesError } = await supabase
      .from('home_zipcodes')
      .insert(homeZipcodesData);
    
    if (homeZipcodesError) throw homeZipcodesError;
    console.log('✅ Home zipcodes imported');

    // 5. Import Zipcodes (in batches due to size)
    console.log('Importing zipcodes...');
    const zipcodesData = JSON.parse(fs.readFileSync('zipcodes.json', 'utf8'));
    
    for (let i = 0; i < zipcodesData.length; i += batchSize) {
      const batch = zipcodesData.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('zipcodes')
        .insert(batch);
      
      if (error) throw error;
      console.log(`✅ Imported zipcodes batch ${Math.floor(i/batchSize) + 1}`);
    }

    console.log('🎉 All data imported successfully!');

  } catch (error) {
    console.error('❌ Import failed:', error.message);
  }
}

// Run the import
importData();