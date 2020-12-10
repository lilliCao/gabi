const EventEmitter = require('events');
const GlobalBus = new EventEmitter();
const kafka = require('kafka-node');
const FXCMCrawler = require('./crawler');
const Log = require('./logger');

async function main() {
    const crawler = new FXCMCrawler({
        accessToken: process.env.FXCM_TOKEN || '0004ac72171d396154ddaebc87487cf326cfdd1e',
        bus: GlobalBus,
        pairs: ["EUR/USD"],
    });

    const producer = new kafka.Producer(new kafka.KafkaClient({kafkaHost: process.env.KAFKA_SERVER || 'kafka:9092'}));
    producer.on('ready', startMsgForwarding(producer));

    // test only
    //setInterval(function () {
     //   GlobalBus.emit('price_update', {Symbol: 'EUR/USD', Rates: [1, 2, 3]})
    //}, 1000);

    crawler.start();
}

function startMsgForwarding(producer,) {
    return function () {
        GlobalBus.on('price_update', data => {
            Log.info(`[${data.Symbol}] Bid: ${data.Rates[0]}, Ask: ${data.Rates[1]}, High: ${data.Rates[2]}, Low: ${data.Rates[3]}, Updated: ${data.Updated}`)
            const msg = {
                topic: process.env.KAFKA_TOPIC || 'dad.price.0',
                messages: JSON.stringify({
                    symbol: data.Symbol,
                    bid: data.Rates[0],
                    ask: data.Rates[1],
                    high: data.Rates[2],
                    low: data.Rates[3],
                    updated: data.Updated,
                })
            };
            producer.send([msg], (err) => {
                if (err) {
                    Log.error(`[Kafka] Failed to send message to the broker`)
                }
            })
        });
    }
}

main();