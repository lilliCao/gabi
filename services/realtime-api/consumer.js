const kafka = require('kafka-node');

class KafkaConsumer {
    constructor({hosts, candleTopic, priceTopic, deserializer}) {
        this.client = new kafka.KafkaClient({
            kafkaHost: hosts
        });
        this.candleTopic = candleTopic;
        this.priceTopic = priceTopic;
        this.consumer = new kafka.Consumer(this.client, [
            {topic: candleTopic, partition: 0},
            {topic: priceTopic, partition: 0},
        ], {
            autoCommit: true
        });
        this.deserializer = deserializer;
        if (deserializer == null) {
            this.deserializer = v => {
                const json = JSON.parse(v);
                const priceKeys = [
                    'bid', 'minBid', 'maxBid', 'openBid', 'closeBid',
                    'ask', 'minAsk', 'maxAsk', 'openAsk', 'closeAsk',
                    'avg', 'minAvg', 'maxAvg', 'openAvg', 'closeAvg',
                    'high', 'low',
                ];
                for (let k of Object.keys(json)) {
                    if (priceKeys.indexOf(k) > -1) {
                        json[k] = json[k].toFixed(5);
                    }
                }
                return json;
            }
        }
    }

    startConsuming(onPriceUpdate, onCandle) {
        this.consumer.on('message', (message) => {
            if (message.topic === this.candleTopic) {
                onCandle(this.deserializer(message.value));
            } else if (message.topic === this.priceTopic) {
                onPriceUpdate(this.deserializer(message.value));
            }
        });
    }
}

module.exports = KafkaConsumer;