const { getChart } = require('./getChart.js');
const { parseBMS, chartData } = require('./chartParser.js')
// const fs = require('fs')

//for testing purposes
// const md5 = ''

// async function permutate(){
//     const decodedData = await getChart(md5)   
//     // console.log(parseBMS(decodedData).notes)
//     const parsed = parseBMS(decodedData).notes
//     const chart = chartData(parsed)
//     // for (const [key, value] of Object.entries(chart)){
//     //     console.log(key,value)
//     // }
// }

// permutate()