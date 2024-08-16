const fs = require('fs')
const axios = require('axios')

module.exports = {
    getChart: async function (md5) {
        try {
            const filePath = `./bms/${md5}`

            if (!fs.existsSync(filePath)) {
                const response = await axios.get(`https://bms-score-viewer-backend.sayakaisbaka.workers.dev/bms/score/get?md5=${md5}`)
                const encodedData = response.data.data
                const decodedData = Buffer.from(encodedData, 'base64').toString('utf-8')
                fs.writeFileSync(filePath, decodedData, 'utf-8');
                console.log(`new ${md5} saved to ${filePath}`)
                return decodedData;
            } else {
                console.log(`bms in ${filePath} already exists`)
                const decodedData = fs.readFileSync(filePath, 'utf-8')

                return decodedData;
            }
        } catch (error) {
            console.error(error);
            throw new Error('Failed to fetch chart data')
        }
    }
}
