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
        const target = 16
        let notes = parts[1];
        notes = normalizeNotes(target, notes)
        return [measure, keyChannels[channel], notes]
    } else if (channel in specialChannels) {
        return [measure, specialChannels[channel], parts[1]]
    }
}

function rotateMeasure(obj){
    const measure = []
    for (let i = 1; i<=7; i++){
        //generate empty lanes
        if(obj[i] === undefined){
            measure.push("_".repeat(16))
        } else {
            measure.push(obj[i])
        }
    }
    let rotated = []
    for (let i = 0; i< measure[0].length; i++) {
        let row = ''
        measure.forEach((s) =>
            row += s[i]
        )
        rotated.push(row)
    }
    return rotated
}

function normalizeNotes(target,notes){
    while (notes.length/2 < target) {
        notes = notes.match(/.{2}/g).reduce((a, c) => a + c + '00', '')
    }
    while (notes.length/2 > target) {
        notes = notes.match(/.{4}/g).reduce((a, c) => a + ( c === '0000' ? '00' : '11'), '');
    }
    notes = notes.match(/.{2}/g).reduce((a, c) => a + ( c === '00' ? '_' : '1'), '');
    return notes
}

export function parseBMS(fileContent) {
    const lines = fileContent.split('\r\n');
    const parsedData = {
        header: {},
        notes: {},
    };

    lines.forEach(line => {
        if (line.startsWith('#') && !line.startsWith('#W')) {
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
    // console.log(parsedData.notes)
    return parsedData
}

export function chartData(parsedData){
    const chart = {}
    for (const measure in parsedData.notes) {
        chart[measure] = rotateMeasure(parsedData.notes[measure])
    }
    return chart
}

export default {
    parseBMS,
    chartData
}