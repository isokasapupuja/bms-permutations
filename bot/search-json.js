const fs = require('fs')

let cachedData = null
let lastModified = null

function readJsonFile(filePath) {

    const stats = fs.statSync(filePath)
    
    if (!cachedData || !lastModified || !lastModified < stats.mtime){
        try {
            const data = fs.readFile(filePath, 'utf8')
            cachedData = JSON.parse(data)
            lastModified =  stats.mtime
        } catch (err) {
            console.error('Error reading JSON file:', err)
            return []
        }
    }
    return cachedData
}

module.exports = {
    /** 
    * @param {Array} artistKeywords keywords to match for "artist" field
    * @param {Array} titleKeywords keywords to match for "title" field
    * @param {Array} difficultyKeywords also keywords to match for "title" field since difficulty is included in the same field
    * @returns an object with "Results". Only returns files with highest keyword match count.
    */
    searchCharts: async function (path, artistKeywords = [], titleKeywords = [], difficultyKeywords = [], tableFolder = '') {
        const bmsData = await readJsonFile(path)
        let searchResults = [];
        let maxMatchCount = 0;

        console.log(
            'Search query:',
            '\n  artist:',artistKeywords,
            '\n  title:',titleKeywords,
            '\n  difficulty:',difficultyKeywords,
            '\n  tableFolder:',tableFolder)

        bmsData.forEach(song => {
            const lowerCaseTitle = song.title.toLowerCase();
            const lowerCaseArtist = song.artist.toLowerCase();

            const titleMatch = titleKeywords.length > 0 ? titleKeywords.some(keyword => lowerCaseTitle.includes(keyword.toLowerCase())) : false;
            const artistMatch = artistKeywords.length > 0 ? artistKeywords.some(keyword => lowerCaseArtist.includes(keyword.toLowerCase())) : false;
            const difficultyMatch = difficultyKeywords.length > 0 ? difficultyKeywords.some(keyword => lowerCaseTitle.includes(keyword.toLowerCase())) : false;
            const tableFolderMatch = 
                tableFolder.length !== 0 && 
                song.data.tableString !== null &&
                song.data.tableString.includes(tableFolder)

            const matchCount = titleMatch + artistMatch + difficultyMatch + tableFolderMatch


            if (matchCount > maxMatchCount) {
                maxMatchCount = matchCount;
                searchResults = []
            }

            if (matchCount === maxMatchCount && matchCount > 0) {
                const chart = song.charts[0]
                searchResults.push({
                    id: song.id,
                    artist: song.artist,
                    title: song.title,
                    aiLevel: chart.data.aiLevel,
                    subtitle: song.data.subtitle,
                    md5: chart.data.hashMD5,
                    tableString: song.data.tableString,
                    matchCount
                });
            }
        });

        if (searchResults.length === 0) {
            return []
        }

        return searchResults
    }
}