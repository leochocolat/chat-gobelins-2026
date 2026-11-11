import axiosClient from './axios';
import cookies from './cookies';

// Utils
import EventDispatcher from 'utils/EventDispatcher';

const RECONNECT_DELAY = 2000;

// One websocket for all the user's channels, dispatching each server event by its type
class Socket extends EventDispatcher {
    constructor() {
        super();

        this._socket = null;
        this._channelIds = [];
        this._reconnectTimeout = null;
    }

    // The server reads the watched channels when the socket opens, so it reopens when they change
    connect(channelIds) {
        const ids = [...channelIds].sort((a, b) => a - b);

        if (this._socket && ids.join() === this._channelIds.join()) return;

        this.disconnect();
        this._channelIds = ids;

        if (ids.length) this._open();
    }

    disconnect() {
        clearTimeout(this._reconnectTimeout);

        if (!this._socket) return;

        // Closed on purpose, it must not reconnect
        this._socket.removeEventListener('close', this._closeHandler);
        this._socket.close();
        this._socket = null;
    }

    send(type, data) {
        if (this._socket?.readyState !== WebSocket.OPEN) return;

        this._socket.send(JSON.stringify({ type, data }));
    }

    _open() {
        const url = new URL('socket', axiosClient.defaults.baseURL);
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

        for (const id of this._channelIds) url.searchParams.append('channel', id);

        // Browsers can't set the Authorization header on a websocket
        url.searchParams.set('token', cookies.get('session'));

        this._socket = new WebSocket(url);
        this._socket.addEventListener('message', this._messageHandler);
        this._socket.addEventListener('close', this._closeHandler);
    }

    _messageHandler = (e) => {
        const { type, data } = JSON.parse(e.data);

        this.dispatchEvent(type, data);
    };

    // The server or the network dropped the socket
    _closeHandler = () => {
        this._socket = null;
        this._reconnectTimeout = setTimeout(() => this._open(), RECONNECT_DELAY);
    };
}

export default new Socket();
