import React, {useEffect, useRef} from 'react';
import {createChart} from 'lightweight-charts';
import moment from "moment";
import socketio from "socket.io-client";
import BaseChart from "../BaseChart";
import config from "../config";


function LineChart() {
    const chartContainerRef = useRef();
    const chart = useRef();
    useEffect(() => {
        chart.current = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            timeScale: {
                tickMarkFormatter: (time) => {
                    //const date = new Date(time.year, time.month, time.day);
                    //return date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate();
                    return moment(time).utc().format("HH:mm:ss")
                },
                borderColor: '#485c7b',
            },
            ...config.general,
        });

        const areaSeries = chart.current.addAreaSeries({
            ...config.area
        });

        areaSeries.setData([]);

        setInterval(() => {
            areaSeries.update({
                time: moment().utc().unix(),
                value: Math.random() * 100,
            })
        }, 1000)
    }, []);

    return (
        <BaseChart chartRef={chart} containerRef={chartContainerRef}>
            EUR/USD - M1
        </BaseChart>
    );
}

export default LineChart;