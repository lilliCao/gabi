import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import socketio from "socket.io-client";


const socket = socketio("http://localhost:3000");
socket.on("connect", () => {
    socket.emit('subscribe', 'EURUSD');
});
socket.on("price", (data) => {
    console.log("Price", data);
});


ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
