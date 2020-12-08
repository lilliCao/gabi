const express = require('express');
const app = express();

const cors = require('cors');
const bodyParser = require('body-parser')

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.get('/api/v1/pairs/:pair/candles/:frame', async (req, res) => {
    const {pair, frame} = req.params;
    let {from, to} = req.query;
    if (from == null || to == null) {
        res.status(400).json({
            err: 'a time window must be provided'
        });
        return;
    }
    try {
        from = parseInt(from);
        to = parseInt(to);
    } catch (e) {
        res.status(400).json({err: 'invalid time window', e: `${e}`});
        return;
    }

    const data = await app.datastore.getCandles(pair, frame, from, to);
    console.log("data", data);
    res.json(data);
});

app.get('/api/v1/pairs/:pair/prices', async (req, res) => {
    const {pair} = req.params;
    let {from, to} = req.query;
    if (from == null || to == null) {
        res.status(400).json({
            err: 'a time window must be provided'
        });
        return;
    }
    try {
        from = parseInt(from);
        to = parseInt(to);
    } catch (e) {
        res.status(400).json({err: 'invalid time window'});
        return;
    }

    const data = await app.datastore.getPrices(pair, from, to);
    res.json(data);
});


module.exports = app;