const fs = require('fs')

function readJsonFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading JSON file:', err);
        return
        [];
    }
}

module.exports = {
    /** 
    * @param {Array} artistKeywords keywords to match for "artist" field
    * @param {Array} titleKeywords keywords to match for "title" field
    * @param {Array} difficultyKeywords also keywords to match for "title" field since difficulty is included in the same field
    * @returns an Array with artist, title, md5hash, tableFolders. Only returns files with highest keyword match count.
    */
    searchCharts: async function (path, artistKeywords = [], titleKeywords = [], difficultyKeywords = []) {
        const bmsData = readJsonFile(path)
        let searchResults = [];
        let maxMatchCount = 0;

        console.log(
            'Search query:',
            '\n  artist:',artistKeywords,
            '\n  title:',titleKeywords,
            '\n  difficulty:',difficultyKeywords)

        bmsData.forEach(song => {
            const lowerCaseTitle = song.title.toLowerCase();
            const lowerCaseArtist = song.artist.toLowerCase();

            const titleMatch = titleKeywords.length > 0 ? titleKeywords.some(keyword => lowerCaseTitle.includes(keyword.toLowerCase())) : false;
            const artistMatch = artistKeywords.length > 0 ? artistKeywords.some(keyword => lowerCaseArtist.includes(keyword.toLowerCase())) : false;
            const difficultyMatch = difficultyKeywords.length > 0 ? difficultyKeywords.some(keyword => lowerCaseTitle.includes(keyword.toLowerCase())) : false;
            const matchCount = titleMatch + artistMatch + difficultyMatch

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
                    md5: chart.data.hashMD5,
                    tableFolders: [chart.data.tableFolders],
                    matchCount
                });
            }
        });

        if (searchResults.length === 0) {
            return ('No results found.')
        }

        return searchResults
    }
}