import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from 'react';
import BaseChart from "../BaseChart";
import {createChart} from "lightweight-charts";
import config from "../config";
import moment from 'moment'

const CandlestickChart = forwardRef((props, ref) => {
    const chartContainerRef = useRef();
    const chart = useRef();
    const [candleSeries, setCandleSeries] = useState([]);
    const [predictionSeries, setPredictionSeries] = useState([]);
    const [currCandle, setCurrCandle] = useState();


    useImperativeHandle(ref, () => ({
        updateData(data) {
            if (!currCandle) return;
            candleSeries.update(data);
            setCurrCandle(data)
        },
        setData(data) {
            candleSeries.setData(data);
            setCurrCandle(data[data.length - 1]);
        },
        updatePrediction(data) {
            predictionSeries.update(data);
        },
        setPrediction(data) {
            predictionSeries.setData(data);
        },
        reset() {
            candleSeries.setData([]);
            predictionSeries.setData([]);
            setCurrCandle({});
        }
    }));

    useEffect(() => {
        chart.current = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            timeScale: {
                // timeVisible: true,
                // secondsVisible: false,

                tickMarkFormatter: (time) => {
                    //     // console.log('time', time)
                    //     //     //const date = new Date(time.year, time.month, time.day);
                    //     //     //return date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate();
                    return moment(time * 1000).utc().format("HH:mm")
                },
                borderColor: '#485c7b',
            },
            ...config.general,
        });

        const predictionSeries = chart.current.addLineSeries({
            ...config.prediction
        });

        predictionSeries.setData([]);
        setPredictionSeries(predictionSeries);

        const candlestickSeries = chart.current.addCandlestickSeries({
            ...config.candlestick
        });

        candlestickSeries.setData([]);
        setCandleSeries(candlestickSeries);
    }, []);

    return (
        <BaseChart chartRef={chart} containerRef={chartContainerRef}>
            EUR/USD - M1
        </BaseChart>
    )
});

export default CandlestickChart;