import React, {useEffect, useImperativeHandle, useRef, useState} from 'react';
import {createChart} from 'lightweight-charts';
import BaseChart from "../BaseChart";
import config from "../config";
import moment from "moment";


function LineChart({lineChartRef}) {
    const chartContainerRef = useRef();
    const [areaSeries, setAreaSeries] = useState()
    const chart = useRef();

    useImperativeHandle(lineChartRef, () => ({
        update(price) {
            areaSeries.update({
                time: price.time,
                value: price.value
            })
        },
        setData(data) {
            areaSeries.setData(data)
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

                tickMarkFormatter: (time) => {
                    // console.log('time', time)
                    //     //const date = new Date(time.year, time.month, time.day);
                    //     //return date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate();
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
        setAreaSeries(areaSeries);

    }, []);


    return (
        <BaseChart chartRef={chart} containerRef={chartContainerRef}>
            EUR/USD - M1
        </BaseChart>

    );
}

export default LineChart;