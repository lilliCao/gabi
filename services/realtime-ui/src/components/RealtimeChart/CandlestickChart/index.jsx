import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from 'react';
import BaseChart from "../BaseChart";
import {createChart} from "lightweight-charts";
import config from "../config";
import {calculateNewCandle} from "../utils";

const CandlestickChart = forwardRef((props, ref) => {
    const chartContainerRef = useRef();
    const chart = useRef();
    const [candleSeries, setCandleSeries] = useState([]);
    const [currCandle, setCurrCandle] = useState();
    useImperativeHandle(ref, () => ({
        update(data) {
            console.log("update", data);
            if (!currCandle) return;
            candleSeries.update(data);
            setCurrCandle(data)
        },
        setData(data) {
            candleSeries.setData(data);
            setCurrCandle(data[data.length - 1]);
        },
        reset() {
            candleSeries.setData([]);
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

                // tickMarkFormatter: (time) => {
                //     // console.log('time', time)
                //     //     //const date = new Date(time.year, time.month, time.day);
                //     //     //return date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate();
                //     return moment(time).utc().format("HH:mm:ss")
                // },
                borderColor: '#485c7b',
            },
            ...config.general,
        });

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