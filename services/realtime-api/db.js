const MongoClient = require('mongodb').MongoClient;

class Datastore {
    constructor(url, dbName) {
        this.url = url;
        this.dbName = dbName;
        this.db = null;
        this.connected = false;

        this.putPrice = this.putPrice.bind(this);
        this.putCandle = this.putCandle.bind(this);
        this.getPrices = this.getPrices.bind(this);
        this.getCandles = this.getCandles.bind(this);
    }

    async connect() {
        this.client = await MongoClient.connect(this.url, {useUnifiedTopology: true});
        this.db = this.client.db(this.dbName);
        this.connected = true;
    }

    putCandle(symbol, frame, data) {
        this._ensureConnection();

        symbol = this._sanitizeSymbol(symbol);
        return this.db.collection(`${symbol}_${frame}`)
            .updateOne({ts: data['ts']}, {$set: data}, {upsert: true})
    }

    putPrice(symbol, data) {
        this._ensureConnection();

        symbol = this._sanitizeSymbol(symbol);
        return this.db.collection(`${symbol}`)
            .updateOne({updated: data['updated']}, {$set: data}, {upsert: true});
    }

    getCandles(symbol, frame, from, to) {
        this._ensureConnection();

        symbol = this._sanitizeSymbol(symbol);
        frame = this._sanitizeSymbol(frame);
        return this._toDocuments(
            this.db.collection(`${symbol}_${frame}`)
                .find({ts: {$gte: from, $lte: to}}).sort({ts: 1})
        );
    }

    getPrices(symbol, from, to) {
        this._ensureConnection();

        symbol = this._sanitizeSymbol(symbol);
        return this._toDocuments(
            this.db.collection(`${symbol}`)
                .find({updated: {$gte: from, $lte: to}}).sort({updated: 1})
        );
    }

    _toDocuments(results) {
        return new Promise((resolve, reject) => {
            results.toArray((err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        })
    }

    _sanitizeSymbol(symbol) {
        return symbol.replace(/\W/gi, '').toUpperCase();
    }

    _ensureConnection() {
        if (!this.connected) {
            throw Error("not connected to the database");
        }
    }
}

module.exports = Datastore;