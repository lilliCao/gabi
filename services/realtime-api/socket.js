const http = require('http');
const socketio = require('socket.io');

class RealtimeSocket {
    constructor(expressApp) {
        this.server = http.createServer(expressApp);
        this.io = socketio(this.server, {
            cors: {
                origin: "http://localhost:3001",
                methods: ["GET", "POST"]
            },
            //path: '/api/v1/connect',
        });
        this.lastPrices = {};
    }

    startListening() {
        this.io.on('connection', (socket) => {
            console.log(socket.id, "connected");
            socket.on('subscribe', (room) => {
                this._subscribe(socket, room);
            });
        });
        this.server.listen(3000);
    }

    publishCandle(symbol, frame, data) {
        symbol = this._sanitizeSymbol(symbol);
        frame = this._sanitizeSymbol(frame);
        this.io.in(`${symbol}_${frame}`).emit("candle", data);
    }

    publishPrice(symbol, data) {
        symbol = this._sanitizeSymbol(symbol);
        this.lastPrices[symbol] = data;
        this.io.in(`${symbol}`).emit("price", data);
    }

    publishNews(symbol, data) {
        symbol = this._sanitizeSymbol(symbol);
        this.io.in(`${symbol}`).emit("news", data);
    }

    _sanitizeSymbol(symbol) {
        return symbol.replace(/\W/gi, '').toUpperCase();
    }

    _subscribe(socket, room) {
        if (!this._isRoomValid(room)) {
            return;
        }
        console.log(socket.id, "joined", room);
        socket.join(room.toUpperCase());
        socket.emit('price', this.lastPrices[room]);
        console.log("Send to", socket.id, this.lastPrices[room])
    }

    _isRoomValid(name) {
        if (typeof name === 'string' || name instanceof String) {
            return true
        }
        // TODO: validate if room name is valid
        return false;
    }
}

module.exports = RealtimeSocket;