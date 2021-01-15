const KafkaConsumer = require('./consumer');
const DataStore = require('./db');
const RealtimeSocket = require('./socket');
const CandleImporter = require('./importer');
const apiServer = require('./api');

const port = process.env.PORT || 3000;
const dbUrl = process.env.DB_URL || "mongodb://root:example@mongo:27017";
const dbName = process.env.DB_NAME || "gabi";
const fxcmToken = process.env.FXCM_TOKEN || '0004ac72171d396154ddaebc87487cf326cfdd1e';


async function main() {
    let importStarted = false;

    const store = new DataStore(dbUrl, dbName);
    await store.connect();
    apiServer.datastore = store;

    const rtSocket = new RealtimeSocket(apiServer);
    const consumer = new KafkaConsumer({
        hosts: "kafka:9092",
        priceTopic: "dad.price.0",
        candleTopic: "dad.candle.0",
        newsTopic: "dad.news.0",
        liveCandleTopic: "dad.livecandle.0",
        predictionTopic: "dad.predictioncandle.0"
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
        if (!importStarted) {
            importStarted = true;
            candleImporter.start(data.ts);
        }
    };

    const onLiveCandle = (candleUpdate) => {
        const {symbol, frame, ...data} = candleUpdate;
        // console.log("Live candle received:", data);
        rtSocket.publishLiveCandle(symbol, frame, data);
        if (!importStarted) {
            importStarted = true;
            candleImporter.start(data.ts);
        }
    };

    const onPredictionCandle = (prediction) => {
        console.log('Prediction received:', prediction);
        const {symbol, frame, data} = prediction;
        if (data) {
            for (let d of data) {
                const t = {ts: d[1], closeBid: d[0].toString(), _id: d[1]}
                store.putPrediction(symbol, frame, t);
                rtSocket.publishPredictionCandle(symbol, frame, t);
            }
        }
    }

    const onNews = (newsUpdate) => {
        const {symbol, ...data} = newsUpdate;
        store.putNews(symbol, data);
        rtSocket.publishNews(symbol, data);
    };

    const onPriceUpdate = (priceUpdate) => {
        const {symbol, ...data} = priceUpdate;
        store.putPrice(symbol, data);
        rtSocket.publishPrice(symbol, data);
    };

    consumer.startConsuming(onPriceUpdate, onCandle, onNews, onLiveCandle, onPredictionCandle);
    rtSocket.startListening(port);
}

main();