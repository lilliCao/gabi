const kafka = require('kafka-node');

class KafkaConsumer {
    constructor({hosts, candleTopic, priceTopic, newsTopic, deserializer}) {
        this.client = new kafka.KafkaClient({
            kafkaHost: hosts
        });
        this.candleTopic = candleTopic;
        this.priceTopic = priceTopic;
        this.newsTopic = newsTopic;
        this.consumer = new kafka.Consumer(this.client, [
            {topic: candleTopic, partition: 0},
            {topic: priceTopic, partition: 0},
            {topic: newsTopic, partition: 0},
            {topic: 'dad.livecandle.0', partition: 0},
        ], {
            autoCommit: true
        });
        this.deserializer = deserializer;
        if (deserializer == null) {
            this.deserializer = v => {
                const json = JSON.parse(v);
                return json;
            }
        }
        this.priceTransform = (json) => {
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
            return json
        }
    }


    startConsuming(onPriceUpdate, onCandle, onNews, onLiveCandle) {
        this.consumer.on('message', (message) => {
            if (message.topic === this.candleTopic) {
                onCandle(this.priceTransform(this.deserializer(message.value)));
            } else if (message.topic === this.priceTopic) {
                onPriceUpdate(this.priceTransform(this.deserializer(message.value)));
            } else if (message.topic === this.newsTopic) {
                onNews(this.deserializer(message.value))
            } else if (message.topic === 'dad.livecandle.0') {
                onLiveCandle(this.priceTransform(this.deserializer(message.value)));
            }
        });
    }
}

module.exports = KafkaConsumer;