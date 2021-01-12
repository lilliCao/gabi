class CandleSyncer {
    constructor(importer, datastore, onCandleCallback) {
        this.datastore = datastore;
        this.importer = importer;
        this.currentCandle = {};
        this.offerTable = {
            'EURUSD': 1,
        };
        this.intervals = {
            'm1': 60,
            'm30': 60 * 30,
        };
        this.synced = {};
        this.buffer = {};
        this.onCandleCallback = onCandleCallback;
    }

    _sync(toTimestamp) {
        console.log("syncing");
        const promises = [];
        for (let interval of Object.keys(this.intervals)) {
            const promise = this.importer.getCandles(1, interval, {
                num: 500,
                to: toTimestamp,
                //from: toTimestamp - 500 * 60,
            }).then(candles => {
                const key = `EURUSD_${interval}`;
                this.currentCandle[key] = candles[candles.length - 1];
                this.synced[key] = 1;
                console.log("synced", candles);
                console.log("synced", key, candles[candles.length-1]);
            });
            promises.push(promise);
        }
        return Promise.all(promises);
    }

    async startSync() {
        console.log("Start Sync");
        await this._sync(Math.floor(new Date().getTime() / 1000) + 60);
        setInterval(this.onTimeElapsed.bind(this), 1000);
    }

    onTimeElapsed() {
        console.log("Elapse");
        for (let interval of Object.keys(this.intervals)) {
            if (!this.synced.hasOwnProperty(interval)) return;
            const key = `EURUSD_${interval}`;
            const timestamp = Math.floor(new Date().getTime() / 1000);
            const endTime = timestamp - timestamp % this.intervals[interval] + this.intervals[interval];
            const lastCandle = this.currentCandle[key];
            if (!lastCandle) continue;
            if (endTime > lastCandle.ts) {
                this.onCandleCallback({...lastCandle, symbol: 'EURUSD'});
                this.currentCandle[key] = {
                    openAsk: lastCandle.closeAsk,
                    closeAsk: lastCandle.closeAsk,
                    highAsk: lastCandle.closeAsk,
                    lowAsk: lastCandle.closeAsk,

                    openBid: lastCandle.closeBid,
                    closeBid: lastCandle.closeBid,
                    lowBid: lastCandle.closeBid,
                    highBid: lastCandle.closeBid,
                    symbol: 'EURUSD',
                    frame: interval,
                    ts: endTime,
                };
            }
        }
    }

    onUpdate(symbol, data) {
        for (let interval of Object.keys(this.intervals)) {
            const key = `EURUSD_${interval}`;
            if (!this.synced.hasOwnProperty(key)) {
                // If not synced, push to buffer
                if (!this.buffer.hasOwnProperty(key)) {
                    this.buffer[key] = [];
                }
                this.buffer[key].push(data);
            } else {
                // Update candle
                // Replay from buffer
                if (this.buffer.hasOwnProperty(key)) {
                    for (let bufData of this.buffer[key]) {
                        this.currentCandle[key] = calculateNewCandle(this.currentCandle[key], bufData, this.intervals[interval])
                    }
                    delete this.buffer[key];
                }
                const current = this.currentCandle[key];
                const newCandle = calculateNewCandle(current, data, this.intervals[interval]);
                //console.log("onUpdate-current", current);
                //console.log("onUpdate-new", newCandle);
                this.currentCandle[key] = newCandle;
                if (current.ts < newCandle.ts) {
                    this.onCandleCallback({...current, symbol: 'EURUSD'});
                }
            }
        }
    }
}

function calculateNewCandle(lastCandle, updateData, frameInSec) {
    const ts = Math.floor(updateData.updated / 1000);
    const endTime = Math.floor(ts - (ts % frameInSec)) + frameInSec;
    const {bid, ask} = updateData;
    const retval = {...lastCandle};

    if (bid > lastCandle.highBid) {
        retval.highBid = bid;
    }
    if (ask > lastCandle.highAsk) {
        retval.highAsk = ask;
    }
    if (bid < lastCandle.lowBid) {
        retval.lowBid = bid;
    }
    if (ask < lastCandle.lowAsk) {
        retval.lowAsk = ask;
    }
    retval.closeBid = bid;
    retval.closeAsk = ask;
    if (endTime > lastCandle.ts) {
        // Set open value for new candle
        retval.openBid = lastCandle.closeBid;
        retval.openAsk = lastCandle.closeAsk;
        retval.highBid = bid;
        retval.highAsk = ask;
        retval.lowBid = bid;
        retval.lowAsk = ask;
    }
    retval.ts = endTime;
    return retval;
}


module.exports = CandleSyncer;