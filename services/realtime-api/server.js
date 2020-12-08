const KafkaConsumer = require('./consumer');
const DataStore = require('./db');
const RealtimeSocket = require('./socket');

const apiServer = require('./api');

const port = process.env.PORT || 3000;


async function main() {
    const store = new DataStore("mongodb://root:example@mongo:27017", process.env.DB_NAME || 'gabi');
    await store.connect();
    apiServer.datastore = store;

    const rtSocket = new RealtimeSocket(apiServer);
    //rtSocket.startListening();

    const consumer = new KafkaConsumer({
        hosts: "kafka:9092",
        priceTopic: "dad.price.0",
        candleTopic: "dad.candle.0"
    });

    const onPriceUpdate = (priceUpdate) => {
        const {symbol, ...data} = priceUpdate;
        store.putPrice(symbol, data);
        rtSocket.publishPrice(symbol, data);
    };

    const onCandle = (candleUpdate) => {
        const {symbol, frame, ...data} = candleUpdate;
        store.putCandle(symbol, frame, data);
        rtSocket.publishCandle(symbol, frame, data);
    };

    consumer.startConsuming(onPriceUpdate, onCandle);
    //apiServer.listen(port, () => {
    //    console.log(`Listening on port ${port}`);
    //})
    rtSocket.startListening();
}

main();