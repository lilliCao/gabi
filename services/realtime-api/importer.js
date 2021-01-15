'use strict';
const io = require('socket.io-client');
const axios = require('axios');
const _ = require('lodash');
const MongoClient = require('mongodb').MongoClient;
const querystring = require('querystring');

class CandleImporter {
    /**
     *  @param accessToken is the access token for FXCM API
     *  @param url is url to connect mongo
     *  @param dbName is the database name of mongo
     */
    constructor({accessToken, url, dbName, onConnected}) {
        this.socket = null;
        this.baseUrl = "http://price-factors-crawler:3000";
        this.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'request',
        };
        // mongodb
        this.url = url;
        this.db = null;
        this.dbName = dbName;
        this.onConnected = onConnected;
    }


    async start(fromTime) {
        await this._connectDB();
        const now = fromTime;
        // let startTs = now - 60 * 60 * 24;
        if (this.onConnected) {
            this.onConnected();
        }

        const candleScenes = [];

        // 1 minute for 3 years
        let num = 10000;
        for (let i = 0; i < 60 * 24 * 365 * 2; i += num) {
            const to = now - i * 60;
            const from = Math.max(now - i - num, 0);
            // const from = to - 10000 * 60;
            candleScenes.push({offerId: 1, periodId: 'm1', num, to});
            // if (from <= startTs) break;
        }

        // 30 minutes for 3 years
        num = 8760;
        for (let i = 0; i < 2 * 24 * 365 * 3; i += num) {
            const to = now - i * 30 * 60;
            // const from = to - 10000 * 60 * 30;
            candleScenes.push({offerId: 1, periodId: 'm30', num, to})
        }

        // 1 hour in year
        num = 8760;
        for (let i = 0; i < 24 * 365 * 5; i += num) {
            const to = now - i * 60 * 60;
            // const from = to - 10000 * 60 * 60;
            candleScenes.push({offerId: 1, periodId: 'H1', num, to})
        }


        for (let candleScene of candleScenes) {
            const candles = await this.getCandles(candleScene.offerId, candleScene.periodId, {
                num: candleScene.num,
                to: candleScene.to,
                from: candleScene.from,
            });
            if (candles != null) {
                await this._putCandleToDb("EURUSD", candleScene.periodId, candles);
            }
        }
    }

    async getCandles(offerId, periodId, params) {
        if (params['from'] == null) delete params['from'];
        const query = querystring.stringify({
            offerId: offerId,
            period: periodId,
            ...params,
        });
        console.log("Query:", `${this.baseUrl}/candles?${query}`);
        const response = await axios.get(`${this.baseUrl}/candles?${query}`);
        if (response.status !== 200) {
            console.debug(`An error occured:`, response.error);
            return;
        }
        //console.log("Response:", response.data);
        return response.data;
    }

    async _putCandleToDb(symbol, frame, data) {
        symbol = this._sanitizeSymbol(symbol);
        console.log('Importing data to collection', `${symbol}_${frame}`, data.length);
        const priceTransform = (json) => {
            const priceKeys = [
                'bid', 'lowBid', 'highBid', 'openBid', 'closeBid',
                'ask', 'lowAsk', 'highAsk', 'openAsk', 'closeAsk',
                'high', 'low',
            ];
            for (let k of Object.keys(json)) {
                if (priceKeys.indexOf(k) > -1) {
                    json[k] = json[k].toFixed(5);
                }
            }
            return {...json, _id: json['ts']}
        };
        data = data.map(priceTransform);
        await this.db.collection(`${symbol}_${frame}`);
        return this.db.collection(`${symbol}_${frame}`).insertMany(data, {
            writeConcern: {w: 1, j: true},
            ordered: false
        }).catch(e => {
        });
    }


    async _connectDB() {
        console.log(`Connecting to DB: ${this.url}`);
        this.client = await MongoClient.connect(this.url, {useUnifiedTopology: true});
        this.db = this.client.db(this.dbName);
        console.log('connected to DB')
    }

    _sanitizeSymbol(symbol) {
        return symbol.replace(/\W/gi, '').toUpperCase();
    }
}

module.exports = CandleImporter;