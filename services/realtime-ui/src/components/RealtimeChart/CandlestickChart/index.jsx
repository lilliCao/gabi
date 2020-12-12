import React, {useEffect, useImperativeHandle, useRef, useState} from 'react';
import BaseChart from "../BaseChart";
import {createChart} from "lightweight-charts";
import config from "../config";

function CandlestickChart({candlesChartRef}) {
    const chartContainerRef = useRef();
    const chart = useRef();
    const [candleSeries, setCandleSeries] = useState();

    useImperativeHandle(candlesChartRef, () => ({
        update(data) {
            candleSeries.update({
                time: data.time,
                open: data.open,
                high: data.high,
                low: data.low,
                close: data.close
            })
        },
        setData(data) {
            candleSeries.setData(data)
        },
        changeInterval(interval) {

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
}

export default CandlestickChart;