import React, {useEffect, useRef, useState} from 'react';
import LineChart from "./LineChart";
import CandlestickChart from "./CandlestickChart";

import useSocket from "../../hooks/useSocket";
import HeaderToolbar from "./HeaderToolbar";
import {getHistoricalCandles, getHistoricalPrices} from "../../services/historicalData";
import _ from 'lodash';

function RealtimeChart() {
    const lineChartRef = useRef();
    const candlesChartRef = useRef();

    const socket = useSocket();

    const [chartType, setChartType] = useState('line');
    const [currency, setCurrency] = useState('EURUSD');
    const [interval, setInterval] = useState('m1');

    useEffect(() => {
        const from = new Date().getTime() - 2.5 * 60000;
        let isSyncing = true;
        let doneSyncing = false;
        const syncData = [];
        socket.on('price', data => {
            if (!data) return;
            if (isSyncing) {
                isSyncing = false;
                syncData.push({time: data.updated, value: data.bid});
                getHistoricalPrices('EURUSD', from).then(res => {
                    const data = res.map(item => {
                        return {
                            time: item.updated,
                            value: item.bid
                        }
                    })
                    let i = 0;
                    for (i; i < data.length; i++) {
                        if (syncData[0].updated === data[data.length - i - 1].updated) {
                            break;
                        }
                    }
                    console.log(data.slice(0, data.length - i));
                    lineChartRef.current.setData([...data.slice(0, data.length - i - 1), ...syncData]);
                    doneSyncing = true;
                });
                return;
            }
            if (!doneSyncing) {
                syncData.push({time: data.updated, value: data.bid})
            }
            lineChartRef.current.update({time: data.updated, value: data.bid});
        });
        socket.emit('subscribe', 'EURUSD');
        return () => {
            socket.disconnect();
        }

    }, [socket]);

    const handleChangeCurrency = currency => {
        console.log('changeCurrency', currency)
        setCurrency(currency)
        lineChartRef.current.setData([]);
        if (chartType === 'line') {
            socket.emit('subscribe', currency)
        }
    }

    const handleChangeInterval = interval => {
        console.log('changeInterval', interval)
        setInterval(interval);
        if (chartType === 'line') {
            lineChartRef.current.changeInterval(interval)
        }
    }

    const handleChangeChartType = chartType => {
        setChartType(chartType);
        if (chartType === 'candles') {
            socket.disconnect();
            const from = Math.round((new Date().getTime() - 60000 * 60 * 24 * 365 * 3) / 1000);
            getHistoricalCandles('EURUSD', 'D1', from).then(res => {
                const data = res.map(item => {
                    return {
                        time: item.ts,
                        open: item.openBid,
                        high: item.highBid,
                        low: item.lowBid,
                        close: item.closeBid
                    }
                })
                console.log('data', data)
                candlesChartRef.current.setData(data);

            });
        }
    }


    return (
        <>
            <HeaderToolbar onChangeCurrency={handleChangeCurrency}
                           onChangeInterval={handleChangeInterval}
                           onChangeChartType={handleChangeChartType}
            />
            {chartType === 'line' &&
            <LineChart lineChartRef={lineChartRef}/>
            }

            {chartType === 'candles' &&
            <CandlestickChart candlesChartRef={candlesChartRef}/>
            }
        </>

    );
}

export default RealtimeChart;