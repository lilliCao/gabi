import React, {useEffect, useRef, useState} from 'react';
import LineChart from "./LineChart";
import CandlestickChart from "./CandlestickChart";

import useSocket from "../../hooks/useSocket";
import HeaderToolbar from "./HeaderToolbar";
import {getHistoricalCandles, getPredictionPrice} from "../../services/historicalData";

const ChartTypes = {
    'candles': CandlestickChart,
    'line': LineChart,
};

const frameMap = {
    'm1': {
        id: 'm1', name: '1 Minute', interval: 60
    },
    'm30': {
        id: 'm30', name: '30 Minutes', interval: 60 * 30
    },
    'H1': {
        id: 'H1', name: '1 Hour', interval: 60 * 60
    }
}

function RealtimeChart() {
    const socket = useSocket();
    const [currChartType, setChartType] = useState(Object.keys(ChartTypes)[1]);
    const [CurrentChart, setCurrentChart] = useState();
    const chartRef = useRef();
    const [currency, setCurrency] = useState('EURUSD');
    const [currentFrame, setCurrentFrame] = useState('m1');
    const [currentCandle, setCurrentCandle] = useState({time: 0, open: 0, high: 0, low: 9999, close: 0});
    const [currentPrediction, setCurrentPrediction] = useState({time: 0, value: 0});


    useEffect(() => setCurrentChart(ChartTypes[currChartType]), [currChartType]);

    const getChart = () => {
        return chartRef.current;
    };

    // const updateCandleHandler = (data) => {
    //     if (!data) return;
    //     console.log("Price", data);
    //     if (data.updated < currentCandle.time) return;
    //     setCurrentCandle(old => calculateNewCandle(old, data, 60));
    // };
    const fetchData = (currency, frame) => {
        const from = Math.round((new Date().getTime() - 60000 * 60 * 100) / 1000);
        getHistoricalCandles(currency, frame, from).then(res => {
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
            setCurrentCandle(data[data.length - 1]);
        });
        getPredictionPrice(currency, frame, from).then(res => {
            const data = res.map(item => {
                return {
                    // time: item.ts,
                    time: item.ts - frameMap[frame].interval,
                    value: item.closeBid
                }
            });
            getChart().setPrediction(data);
        });
    }

    useEffect(() => {
        socket.on('predictioncandle', prediction => {
            if (prediction.ts > currentPrediction.time) {
                console.log('chart new prediction', prediction)
                setCurrentPrediction({
                    // time: prediction.ts,
                    time: prediction.ts - frameMap[currentFrame].interval,
                    value: prediction.closeBid
                })
            }
        });

        socket.on('livecandle', candle => {
            setCurrentCandle({
                time: candle.ts,
                open: candle.openBid,
                high: candle.highBid,
                low: candle.lowBid,
                close: candle.closeBid,
            });
        });
        socket.emit('subscribe', 'EURUSD_m1');
        //socket.emit('subscribe', 'EURUSD');
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
        fetchData(currency, currentFrame);
        return () => {
            socket.disconnect();
        }
    }, [socket, currChartType]);

    useEffect(() => {
        if (!CurrentChart || currentCandle.time === 0) return;
        getChart().updateData(currentCandle);
    }, [currentCandle]);

    useEffect(() => {
        if (!CurrentChart || currentPrediction.time === 0) return;
        getChart().updatePrediction(currentPrediction);
    }, [currentPrediction])

    const resetData = (currency, frame) => {
        getChart().reset();
        setCurrentCandle({time: 0, open: 0, high: 0, low: 9999, close: 0});
        setCurrentPrediction({time: 0, value: 0});
        fetchData(currency, frame);
    }

    const handleChangeCurrency = currency => {
        setCurrency(currency);
        resetData(currency, currentFrame);
    };

    const handleChangeFrame = frame => {
        setCurrentFrame(frame);
        resetData(currency, frame);
    };

    const handleChangeChartType = chartType => {
        setChartType(chartType);
    };

    return (
        <>
            <HeaderToolbar
                frames={Object.values(frameMap)}
                currency={currency}
                chartType={currChartType}
                frame={currentFrame}
                onChangeCurrency={handleChangeCurrency}
                onChangeFrame={handleChangeFrame}
                onChangeChartType={handleChangeChartType}
            />
            {CurrentChart &&
            <CurrentChart ref={chartRef}/>
            }
        </>

    );
}

export default RealtimeChart;