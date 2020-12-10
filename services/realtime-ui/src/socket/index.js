import socketio from "socket.io-client";


export const initSocket = (server) => {
    const socket = socketio(server);
    socket.on("connect", () => {
        socket.emit('subscribe', 'EURUSD');
    });
   return socket
};