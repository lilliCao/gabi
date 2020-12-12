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
        candleTopic: "dad.candle.0",
        newsTopic: "dad.news.0",
    });

    const onPriceUpdate = (priceUpdate) => {
        const {symbol, ...data} = priceUpdate;
        //console.log('onPriceUpdate', data)
        store.putPrice(symbol, data);
        rtSocket.publishPrice(symbol, data);
    };

    const onCandle = (candleUpdate) => {
        const {symbol, frame, ...data} = candleUpdate;
        store.putCandle(symbol, frame, data);
        rtSocket.publishCandle(symbol, frame, data);
    };

    const onNews = (newsUpdate) => {
        const {symbol, ...data} = newsUpdate;
        console.log('receive news', data.title)
        store.putNews(symbol, data);
        rtSocket.publishNews(symbol, data);
    };


    consumer.startConsuming(onPriceUpdate, onCandle, onNews);
    //apiServer.listen(port, () => {
    //    console.log(`Listening on port ${port}`);
    //})
    rtSocket.startListening();
}

main();