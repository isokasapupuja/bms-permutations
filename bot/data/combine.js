const fs = require('fs');

// Read the JSON files
const songsData = JSON.parse(fs.readFileSync('songs-bms.json', 'utf8'));
const chartsData = JSON.parse(fs.readFileSync('charts-bms.json', 'utf8'));

// Create a Map to store songs by ID
const songsMap = new Map();
songsData.forEach(song => songsMap.set(song.id, song));

// Combine songs and charts using the Map
const combinedData = chartsData.map(chart => ({
  ...songsMap.get(chart.songID),
  charts: [chart],
}));

// Write the combined data to a new JSON file
fs.writeFileSync('combined-data.json', JSON.stringify(combinedData, null, 2));