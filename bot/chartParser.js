function handleChannels(parts) {
    const keyChannels = {
        '11': '1',
        '12': '2',
        '13': '3',
        '14': '4',
        '15': '5',
        '18': '6',
        '19': '7',
        '16': 'S',
    }
    const specialChannels = {
        '02': 'BPMx',
        '03': 'BPM'
    }

    //unsure how to handle 09 - stop channel for now, maybe irrelevant for now

    const channel = parts[0].slice(3, 5)
    const measure = parts[0].slice(0, 3)

    if (channel in keyChannels) {
        let notes = parts[1];
        return [measure, keyChannels[channel], notes]
    } else if (channel in specialChannels) {
        let bpm = parts[1]
        if (specialChannels[channel] === 'BPMx'){
            bpm = Number(bpm)
        }
        return [measure, specialChannels[channel], bpm]
    }
}

module.exports = {
    parseBMS: function (fileContent) {
        const lines = fileContent.split('\r\n');
        const parsedData = {
            header: {},
            notes: {},
        };

        lines.forEach(line => {
            if (line.startsWith('#') && !line.startsWith('#W') && !line.startsWith('#BMP')) {
                line = line.slice(1)
                if (!isNaN(line[1])) {
                    let parts = line.split(':')
                    parts = handleChannels(parts)
                    if (parts === undefined) {
                        return
                    }
                    const measure = parts[0]
                    const channel = parts[1]
                    const data = parts[2]

                    if (!parsedData.notes[measure]) {
                        parsedData.notes[measure] = {};
                    }

                    parsedData.notes[measure][channel] = data

                } else {
                    const parts = line.split(' ')
                    parsedData.header[parts[0]] = parts[1]
                }
            }
        });
        return parsedData
    },

    chartData : function(data) {
        const measureStampData = {}
        for (const [m, lanes] of Object.entries(data)){
            Object.keys(lanes).forEach((lane) => {
                // TODO: deal with bpm changes
                if (typeof lanes[lane] === 'number'){
                    let t = Number(m).toFixed(4)
                    if (!measureStampData[t]) {
                        measureStampData[t] = []
                    }
                    measureStampData[t].push(`BPMx:${lanes[lane]}`)
                } else {
                    // m = integer measure
                    // lane = the key/type
                    // lanes[lane] the objects in the lane

                    // objects are grouped into array
                    const laneObjects = lanes[lane].match((/.{2}/g))
                    // check into how many parts a measure is divided into
                    const signature = laneObjects.length
                    laneObjects.forEach((noteObject, index) => {
                        if (noteObject !== '00') {
                            let t = (Number(m) + (1 * index / signature)).toFixed(4)

                            if (!measureStampData[t]) {
                                measureStampData[t] = [];
                            }

                            if (!lane.startsWith('BPM')){
                            measureStampData[t].push(lane)
                            } else {
                                let bpm = parseInt(`0x${noteObject}`,16)
                                measureStampData[t].push(`${lane}:${bpm}`)
                            }
                        }
                    })
                }
            })
        }

        //sort the measures
        const sortedChartData = Object.entries(measureStampData)
            .sort(([a], [b]) => a - b)
            .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})

        return sortedChartData
    }
}