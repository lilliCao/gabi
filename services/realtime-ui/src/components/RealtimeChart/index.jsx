import React, {useEffect, useRef, useState} from 'react';
import LineChart from "./LineChart";
import CandlestickChart from "./CandlestickChart";

import useSocket from "../../hooks/useSocket";
import HeaderToolbar from "./HeaderToolbar";
import {getHistoricalCandles} from "../../services/historicalData";
import {calculateNewCandle} from "./utils";

const ChartTypes = {
    'candles': CandlestickChart,
    'line': LineChart,
};

function RealtimeChart() {
    const socket = useSocket();
    const [currChartType, setChartType] = useState(Object.keys(ChartTypes)[0]);
    const [CurrentChart, setCurrentChart] = useState();
    const chartRef = useRef();
    const [currency, setCurrency] = useState('EURUSD');
    const [interval, setInterval] = useState('m1');
    const [currentCandle, setCurrentCandle] = useState({time: 0, open: 0, high: 0, low: 9999, close: 0});

    useEffect(() => setCurrentChart(ChartTypes[currChartType]), [currChartType]);

    const getChart = () => {
        return chartRef.current;
    };

    const updateCandleHandler = (data) => {
        if (!data) return;
        console.log("Price", data);
        if (data.updated < currentCandle.time) return;
        setCurrentCandle(old => calculateNewCandle(old, data, 60));
    };

    useEffect(() => {
        socket.on('price', updateCandleHandler.bind(this));
        socket.emit('subscribe', 'EURUSD_m1');
        socket.emit('subscribe', 'EURUSD');
        socket.on('candle', item => {
            console.log("Candle update", item);
            if (item.ts <= currentCandle.time) return;
            setCurrentCandle({
                time: item.ts,
                open: item.openBid,
                high: item.highBid,
                low: item.lowBid,
                close: item.closeBid,
            });
        });
        const from = Math.round((new Date().getTime() - 60000 * 60 * 3) / 1000);
        getHistoricalCandles('EURUSD', 'm1', from).then(res => {
            const data = res.map(item => {
                return {
                    time: item.ts,
                    open: item.openBid,
                    high: item.highBid,
                    low: item.lowBid,
                    close: item.closeBid,
                }
            });
            getChart().setData(data);
            console.log("setData", data);
            setCurrentCandle(data[data.length - 1]);
        });
        return () => {
            socket.disconnect();
        }
    }, [socket, currChartType]);

    useEffect(() => {
        if (!CurrentChart || currentCandle.time === 0) return;
        getChart().update(currentCandle);
    }, [currentCandle]);

    const handleChangeCurrency = currency => {
        console.log('changeCurrency', currency)
        setCurrency(currency);
    };

    const handleChangeInterval = interval => {
        console.log('changeInterval', interval)
    };

    const handleChangeChartType = chartType => {
        setChartType(chartType);
        if (chartType === 'candles') {
            //socket.disconnect();
        }
    };

    return (
        <>
            <HeaderToolbar
                currency={currency}
                chartType={currChartType}
                interval={interval}
                onChangeCurrency={handleChangeCurrency}
                onChangeInterval={handleChangeInterval}
                onChangeChartType={handleChangeChartType}
            />
            {CurrentChart &&
            <CurrentChart ref={chartRef}/>
            }
        </>

    );
}

export default RealtimeChart;