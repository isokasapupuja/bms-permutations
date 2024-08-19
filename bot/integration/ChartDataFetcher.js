require('dotenv').config();
const fs = require('fs')
const path = require('path')
const axios = require('axios');
const axiosRetry = require('axios-retry').default;

const MAX_RETRIES = 3
axiosRetry(axios, {
    retries: MAX_RETRIES,
    retryDelay: (retryCount) => {
        console.log(`retry attempt: ${retryCount}`)
        return retryCount * 2000;
    },
    retryCondition: (error) => {
        // if retry condition is not specified, by default idempotent requests are retried
        return error.response.status >= 500
    },
})

let LAST_CHANGE = -1
/**
 * @returns {Date | number} Last instant when a file was updated, or `-1` if never.
 */
function lastChange() {
    return LAST_CHANGE
}
const INTERVALS = []
const DAY_IN_MS = 86_400_000
const LEEWAY_MS = 60_000

const URL_BASE = process.env.URL_TACHI_GITHUB_ARTEFACT_BASE_PATH
const FILE_BASE = process.env.FILE_BASE_PATH
const FILE_NAME_CHARTS = process.env.FILE_NAME_CHARTS
const FILE_NAME_SONGS = process.env.FILE_NAME_SONGS

function clearAllIntervals() {
    console.info('Clearing all intervals')
    for (const intervalId of INTERVALS) {
        clearInterval(intervalId)
    }
    INTERVALS.length = 0; // js lol
    console.info('Intervals cleared')
}

function nextTargetInstant({ hour = 0, minute = 0, second = 0, millisecond = 0 }) {
    console.debug(`h: ${hour}, m: ${minute}, s: ${second}, ms: ${millisecond}`)

    const now = new Date()
    const targetDate = new Date(
        Date.UTC(
            now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute, second
        ) + millisecond
    )

    const missedIt = now >= targetDate
    console.debug(`missed? ${missedIt}, now: ${now}, targetDate: ${targetDate}`)
    if (missedIt) {
        targetDate.setUTCDate(targetDate.getUTCDate() + 1)
    }

    return targetDate
}

/**
 * Periodically fetches data from a specified URL at given intervals.
 *
 * @param {Object} options - The options object for configuring the fetcher.
 * @param {boolean} [options.alsoFetchImmediately] - Makes a query immediately without waiting
 * @param {Date} options.initialFetchDateTime - The starting date and time for the first fetch. Must be a valid Date object.
 * @param {number} options.intervalMs - The interval in seconds between each fetch. Must be a positive number.
 * @param {string} options.url - The URL to fetch data from.
 * @param {Function} options.callback - The callback function that is called after each query
 *
 * @throws {TypeError} If `initialFetchDateTime` is not a valid Date object.
 * @throws {RangeError} If `initialFetchDateTime` is in the past.
 * @throws {TypeError} If `intervalSeconds` is not a positive number.
 * @throws {TypeError} If `url` is not a string.
 * @throws {TypeError} If `callback` is not a function
 *
 * @example
 * initInterval({
 *     alsoFetchImmediately: true,
 *     initialFetchDateTime: new Date(Date.now() + 10_000), // ten seconds from now
 *     intervalMs: 60_000, // query every minute
 *     url: url,
 *     callback: (data) => {
 *         console.log("GOT DATA: ", data)
 *     }
 * })
 */
function initInterval({ alsoFetchImmediately, initialFetchDateTime, intervalMs, url, callback }) {
    _assertParameters(initialFetchDateTime, intervalMs, url, callback);

    const waitTime = initialFetchDateTime - Date.now()
    console.info(`Sending initial request ${waitTime} ms from now (${new Date(initialFetchDateTime)}) to ${url} with interval ${intervalMs}`)
    if (alsoFetchImmediately) {
        console.info("Also fetching immediately...");
        _makeQuery()
    }

    setTimeout(() => {
        _makeQuery() // initial query after the wait
        const intervalId = setInterval(() => _makeQuery(), intervalMs)
        INTERVALS.push(intervalId)
    }, waitTime)

    async function _makeQuery() {
        console.info(`Making GET request to ${url}`)
        callback(await axios.get(url)
            .then((response) => {
                console.info(`Got response from ${url} with status ${response.status}`)
                return response.data
            })
            .catch((err) => {
                if (err.response.status !== 200) {
                    throw new Error(`API call to ${url} failed with status code: ${err.response.status} after ${MAX_RETRIES} retry attempts`);
                }
            }));
    }

    function _assertParameters(initialFetchDateTime, intervalSeconds, url, callback) {
        if (!(initialFetchDateTime instanceof Date) || isNaN(initialFetchDateTime)) {
            throw new TypeError(`initialFetchDateTime must be a valid Date object, ${initialFetchDateTime}`);
        }
        if (initialFetchDateTime <= Date.now()) {
            throw new RangeError(`initialFetchDateTime must be in the future, ${initialFetchDateTime}`);
        }
        if (typeof intervalSeconds !== 'number' || intervalSeconds <= 0) {
            throw new TypeError(`intervalSeconds must be a positive number, ${intervalSeconds}`);
        }
        if (typeof url !== 'string') {
            throw new TypeError(`url must be a string, ${url}`);
        }
        if (typeof callback !== 'function') {
            throw new TypeError(`callback must be a function, ${callback}`)
        }
    }
}

function init(fileName, updateAt, intervalMs) {
    let _callback;
    const promise = new Promise((resolve, reject) => {
        _callback = (data) => {
            console.info(`Got data with length: ${data?.length}`)
            try {
                data = JSON.stringify(data, null, 2)
            } catch (err) {
                console.warn("Problem with converting data to json string")
                reject(new Error(err))
            }

            const filePath = path.join(FILE_BASE, fileName)
            console.info(`Writing file to ${filePath}`)
            fs.writeFile(filePath, data, (err) => {
                if (err) {
                    console.error('Error writing to file:', err)
                    reject(err)
                } else {
                    console.log('File written successfully!')
                    LAST_CHANGE = new Date()
                    resolve(data)
                }
            })
        }
    })

    const nextInstant = nextTargetInstant(updateAt)
    const nextInstantIsNotClose = (nextInstant - Date.now()) >= LEEWAY_MS
    initInterval({
        alsoFetchImmediately: nextInstantIsNotClose,
        initialFetchDateTime: nextInstant,
        intervalMs: intervalMs,
        url: path.join(URL_BASE, fileName),
        callback: _callback
    })

    return promise
}

async function initMultiPromise(updateAt, intervalMs) {
    return Promise
        .all([
            init(FILE_NAME_CHARTS, updateAt, intervalMs),
            init(FILE_NAME_SONGS, updateAt, intervalMs)
        ])
        .then((results) => {
            console.log('Both initializations completed successfully');
            return results;
        })
        .catch((error) => {
            console.error('One of the initializations failed:', error);
            throw error;
        });
}

/**
 * Inits with one day interval at `01:35:00:0000 UTC`
 * 
 * @returns {Promise<[]>} Two part promise
 * 
 * @example
 * initDefault()
    .then((response) => {
        console.log(response[0].length, response[1].length)
        console.log("EPIC")
    })
    .catch((err) => {
        console.warn("Initialization was unsuccessful", err)
    })
 */
async function initDefault() {
    const updateAt = {
        hour: 1,
        minute: 35,
        second: 0,
        millisecond: 0,
    }

    return initMultiPromise(updateAt, 30_000)
}

/**
 * Works like {@link initDefault} but you get to define your own start time and interval.
 * Undefined parameters will default to zero, except intervalMs, which is mandatory.
 * 
 * @param {Object} options
 * @param {number} [options.hour]  
 * @param {number} [options.minute]  
 * @param {number} [options.second]  
 * @param {number} [options.millisecond]  
 * @param {number} options.intervalMs  
 * 
 * @returns {Promise<[*,*]>} Two part promise
 * 
 * @throws {Argu}
 * 
 * @example
 * initCustom({hour: 12, minute: 34, second: 56, intervalMs: 60_000})
    .then((response) => {
        console.log(response[0].length, response[1].length)
        console.log("EPIC")
    })
    .catch((err) => {
        console.warn("Initialization was unsuccessful", err)
    })
 */
function initCustom({ hour = 0, minute = 0, second = 0, millisecond = 0, intervalMs }) {
    if (!intervalMs || typeof intervalMs !== 'number' || intervalMs <= 0) {
        throw new TypeError(`Interval must be defined, ${intervalMs}`)
    }

    const updateAt = {
        hour: hour,
        minute: minute,
        second: second,
        millisecond: millisecond,
    }

    return initMultiPromise(updateAt, intervalMs)
}

module.exports = { initDefault, initCustom, clearAllIntervals, lastChange }
