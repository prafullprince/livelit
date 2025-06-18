import { io } from "socket.io-client";

const socket = io("https://rent-a-buddy-server-1.onrender.com", {
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
    secure: true,
});

export default socket;
