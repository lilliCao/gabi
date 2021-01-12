const KafkaConsumer = require('./consumer');
const DataStore = require('./db');
const RealtimeSocket = require('./socket');
const CandleImporter = require('./importer');
const CandleSyncer = require('./candleSyncer');
const apiServer = require('./api');

const port = process.env.PORT || 3000;
const dbUrl = process.env.DB_URL || "mongodb://root:example@mongo:27017";
const dbName = process.env.DB_NAME || "gabi";
const fxcmToken = process.env.FXCM_TOKEN || '0004ac72171d396154ddaebc87487cf326cfdd1e';


async function main() {
    const store = new DataStore(dbUrl, dbName);
    await store.connect();
    apiServer.datastore = store;

    const rtSocket = new RealtimeSocket(apiServer);
    const consumer = new KafkaConsumer({
        hosts: "kafka:9092",
        priceTopic: "dad.price.0",
        candleTopic: "dad.candle.0",
        newsTopic: "dad.news.0",
    });
    const candleImporter = new CandleImporter({
        accessToken: fxcmToken,
        url: dbUrl,
        dbName: dbName,
    });

    const onCandle = (candleUpdate) => {
        const {symbol, frame, ...data} = candleUpdate;
        console.log("Candle received:", data);
        store.putCandle(symbol, frame, data);
        rtSocket.publishCandle(symbol, frame, data);
    };

    const onNews = (newsUpdate) => {
        const {symbol, ...data} = newsUpdate;
        console.log("on news");
        store.putNews(symbol, data);
        rtSocket.publishNews(symbol, data);
    };

    const candleSyncer = new CandleSyncer(candleImporter, store, onCandle);
    candleImporter.onConnected = () => candleSyncer.startSync();
    candleImporter.start();

    const onPriceUpdate = (priceUpdate) => {
        const {symbol, ...data} = priceUpdate;
        store.putPrice(symbol, data);
        //console.log("Price update", data);
        rtSocket.publishPrice(symbol, data);
        candleSyncer.onUpdate(symbol, data);
    };

    consumer.startConsuming(onPriceUpdate, onCandle, onNews);
    rtSocket.startListening(port);
}

main();