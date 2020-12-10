import React, {useEffect, useRef} from 'react';
import LineChart from "./LineChart";
import useSocket from "../../hooks/useSocket";
import HeaderToolbar from "./HeaderToolbar";


function RealtimeChart() {
    const lineChartRef = useRef();
    const socket = useSocket();

    useEffect(() => {
        socket.on('price', data => {
            if (data) {
                const time = Math.round(data.updated / 1000);
                const value = data.bid;
                lineChartRef.current.update({time, value});
            }

        });
    }, [socket]);

    const handleChangeCurrency = currency => {
        console.log('changeCurrency', currency)
        lineChartRef.current.setData([]);
        socket.emit('subscribe', currency)
    }

    const handleChangeInterval = interval => {
        console.log('changeInterval', interval)
        lineChartRef.current.changeInterval(interval)
    }


    return (
        <>
            <HeaderToolbar onChangeCurrency={handleChangeCurrency}
                           onChangeInterval={handleChangeInterval}/>
            <LineChart lineChartRef={lineChartRef}/>
        </>

    );
}

export default RealtimeChart;