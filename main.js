const start = Date.now();
const fs = require('node:fs');

const filePath = process.argv[2]
console.log(process.argv)

async function main() {
    const parser = await import('./parser.js')

    if (filePath != undefined) {
        console.log(filePath)
        fs.readFile(filePath, 'utf-8', (err, data) => {
            if (err) {
                console.error(err);
                return;
            }
            const parsed = parser.parseBMS(data)

            const chart = parser.chartData(parsed)

            //for console viewing
            // Object.keys(chart).reverse().forEach((element) => chart[element].reverse().forEach((chord) => console.log(chord)))
            let fullChart = []
            Object.keys(chart).forEach((element) => chart[element].forEach((chord) => fullChart.push(chord)))

            // logging debug
            // console.log(fullChart)
            // console.log(parsed.header)
            // console.log(notes)

            const end = Date.now();
            console.log(`Execution time: ${end - start} ms`);
        })
    } else {
        console.log('no file specified')
        process.exit()
    }
}

main()