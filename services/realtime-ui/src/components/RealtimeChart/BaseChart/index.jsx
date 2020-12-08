import React, {useEffect, useRef} from 'react';
import socketio from "socket.io-client";


const socket = socketio("http://localhost:3000");
socket.on("connect", () => {
    socket.emit('subscribe', 'EURUSD');
});
socket.on("price", (data) => {
    console.log("Price", data);
});

function BaseChart({containerRef, chartRef, children}) {
    const chartContainerRef = containerRef;
    const chart = chartRef;

    const resizeObserver = useRef();
    // Resize chart on container resizes.
    useEffect(() => {
        resizeObserver.current = new ResizeObserver(entries => {
            const {width, height} = entries[0].contentRect;
            chart.current.applyOptions({width, height});
            setTimeout(() => {
                chart.current.timeScale().fitContent();
            }, 0);
        });
        resizeObserver.current.observe(chartContainerRef.current);
        return () => resizeObserver.current.disconnect();
    }, []);

    return (
        <div className="chart-wrapper">
            <div className="chart-header">
                {children}
            </div>
            <div ref={chartContainerRef} className="chart-container"/>
        </div>
    );
}

export default BaseChart;