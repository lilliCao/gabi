'use strict';
const io = require('socket.io-client');
const axios = require('axios');
const _ = require('lodash');
const {BulkWriteError} = require("mongodb");
const MongoClient = require('mongodb').MongoClient;


class CandlesImporter {
    /**
     *  @param accessToken is the access token for FXCM API
     *  @param url is url to connect mongo
     *  @param dbName is the database name of mongo
     */
    constructor({accessToken, url, dbName}) {
        this.socket = null;
        this.token = accessToken;
        this.baseUrl = "https://api-demo.fxcm.com";
        this.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'request',
        };
        // mongodb
        this.url = url;
        this.dbName = dbName;
        this.db = null;

        this.isConnecting = false;
        this.reconnectionDelay = 500;
        this.checkInterval = 5 * 1000;
        this.maxTimeGap = 30 * 1000;
    }

    async start() {
        await this._connectDB();
        await this._connectFXCMLoop();
        setInterval(this._connectFXCMLoop.bind(this), this.checkInterval);
    }

    async _connectFXCMLoop() {
        try {
            if (this.isConnecting) return;

            // If connection is closed, try to establish a new one
            if (this.socket == null) {
                await this._connectFXCM();
            }
        } catch (e) {
        }
    }


    async _onConnectedFXCM() {
        this.isConnecting = false;
        this.headers['Authorization'] = `Bearer ${this.socket.id}${this.token}`;
        const now = Math.round(Date.now() / 1000)
        const candleScenes = [];

        // 1 minute for 3 years
        let num = 10000;
        for (let i = 0; i < 60 * 24 * 365 * 3; i += num) {
            const to = now - i * 60;
            // const from = to - 10000 * 60;
            candleScenes.push({offerId: 1, periodId: 'm1', num, to})
        }

        // 30 minutes for 3 years
        num = 8760
        for (let i = 0; i < 2 * 24 * 365 * 3; i += num) {
            const to = now - i * 30 * 60;
            // const from = to - 10000 * 60 * 30;
            candleScenes.push({offerId: 1, periodId: 'm30', num, to})
        }

        // 1 hour in year
        num = 8760
        for (let i = 0; i < 24 * 365 * 3; i += num) {
            const to = now - i * 60 * 60;
            // const from = to - 10000 * 60 * 60;
            candleScenes.push({offerId: 1, periodId: 'H1', num, to})
        }

        // 4 hour in year
        num = 2190
        for (let i = 0; i < 6 * 365 * 3; i += num) {
            const to = now - 60 * 60 * 4 * i;
            candleScenes.push({offerId: 1, periodId: 'H4', num, to})
        }

        // 1 day in year
        num = 365
        for (let i = 0; i < 3 * 365; i += 365) {
            const to = now - 60 * 60 * 24 * i;
            candleScenes.push({offerId: 1, periodId: 'D1', num, to})
        }

        for (let candleScene of candleScenes) {
            await this._getCandles(candleScene.offerId, candleScene.periodId, candleScene.num, candleScene.to);
        }
        process.exit(0);
    }

    async _connectDB() {
        console.log(`Connecting to DB: ${this.url}`);
        this.client = await MongoClient.connect(this.url, {useUnifiedTopology: true});
        this.db = this.client.db(this.dbName);
        console.log('connected to DB')
    }

    _connectFXCM() {
        return new Promise(((resolve, reject) => {
            this.isConnecting = true;
            this.socket = io(this.baseUrl, {
                query: `access_token=${this.token}`,
                reconnection: true,
                reconnectionDelay: this.reconnectionDelay,
            });
            console.log(`Connecting to broker: ${this.baseUrl}`);
            this.socket.on('connect', async () => {
                console.log("Connected to broker");
                console.debug(`Socket.IO session has been opened: ${this.socket.id}`);
                await this._onConnectedFXCM();
                resolve();
            });

            this.socket.on('connect_error', (error) => {
                console.error(`Socket.IO session connect error: ${error}`);
                this._onDisconnect();
                reject(error);
            });
            this.socket.on('error', (error) => {
                console.error(`Socket.IO session error: ${error}`);
                this._onDisconnect();
                reject(error);
            });
            this.socket.on('disconnect', () => {
                this._onDisconnect();
                console.debug('Socket disconnected, terminating client.');
            });
        }));
    }

    async _getCandles(offerId, periodId, num, to) {
        if (this.socket == null) {
            throw Error("Not connected");
        }
        console.debug('Getting historical candles from market data', offerId, periodId, num, to);
        const response = await axios.get(`${this.baseUrl}/candles/${offerId}/${periodId}?num=${num}&to=${to}`, {headers: this.headers});
        if (response.status !== 200) {
            console.debug(`An error occured while subscribing: ${response}`);
            return;
        }
        const {data} = response;
        if (!data.response.executed) {
            console.debug(`Error: The request was not executed by the server: ${data}`);
            return;
        }

        return this._handleResponse(data.candles, periodId)
    }

    _handleResponse(candles, periodId) {
        const convertedCandles = candles.map(candle => {
            return {
                _id: candle[0],
                openBid: candle[1],
                closeBid: candle[2],
                highBid: candle[3],
                lowBid: candle[4],
                ts: candle[0]
            }
        })

        // offer_id: 1 currency: EUR/USD
        return this._putCandleToDb("EUR/USD", periodId, convertedCandles);
    }

    _putCandleToDb(symbol, frame, data) {
        symbol = this._sanitizeSymbol(symbol);
        console.log('Importing data to collection', `${symbol}_${frame}`, data.length)
        return this.db.collection(`${symbol}_${frame}`).insertMany(data, {
            writeConcern: {w: 1, j: true},
            ordered: false
        }).catch(e => {
        });
    }

    _onDisconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
        this.socket = null;
        this.isConnecting = false;
    }

    _sanitizeSymbol(symbol) {
        return symbol.replace(/\W/gi, '').toUpperCase();
    }
}

const candlesImporter = new CandlesImporter({
    accessToken: process.env.FXCM_TOKEN || '0004ac72171d396154ddaebc87487cf326cfdd1e',
    url: "mongodb://root:example@mongo:27017",
    dbName: process.env.DB_NAME || 'gabi',
});

candlesImporter.start();
