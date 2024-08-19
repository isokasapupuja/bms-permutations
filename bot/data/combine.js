require('dotenv').config();
const fs = require('fs');
const FILE_BASE = process.env.FILE_BASE_PATH
const CHARTS_JSON = process.env.FILE_NAME_CHARTS
const SONGS_JSON = process.env.FILE_NAME_SONGS
const combinedJSON = process.env.FILE_NAME_COMBINED

function combineJson() {
    const songsData = JSON.parse(fs.readFileSync(`${FILE_BASE}${SONGS_JSON}`, 'utf8'));
    const chartsData = JSON.parse(fs.readFileSync(`${FILE_BASE}${CHARTS_JSON}`, 'utf8'));
    const songsMap = new Map();
    try {
        if (songsData && chartsData){

            songsData.forEach(song => songsMap.set(song.id, song));

            const combinedData = chartsData.map(chart => ({
                ...songsMap.get(chart.songID),
                charts: [chart],
            }));

            fs.writeFileSync(`${FILE_BASE}${combinedJSON}`, JSON.stringify(combinedData, null, 2));

        console.log(`Created ${FILE_BASE}${combinedJSON}`)
        }
    } catch (error) {
        console.log(error)
    }
}

module.exports = { combineJson }