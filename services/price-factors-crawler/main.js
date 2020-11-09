const EventEmitter = require('events');
const GlobalBus = new EventEmitter();
const FXCMCrawler = require('./crawler');
const Log = require('./logger');

async function main() {
    const crawler = new FXCMCrawler({
        accessToken: process.env.FXCM_TOKEN || '0004ac72171d396154ddaebc87487cf326cfdd1e',
        bus: GlobalBus,
        pairs: ["EUR/USD"],
    });
    GlobalBus.on('price_update', p => {
        //TODO: publish event to kafka
        Log.info(`[${p.Symbol}] Bid: ${p.Rates[0]}, Ask: ${p.Rates[1]}, High: ${p.Rates[2]}, Low: ${p.Rates[3]}`)
    });
    crawler.start();
}

main();