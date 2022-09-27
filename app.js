import express from 'express';
import {Server} from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import http from 'http';
import { join } from 'path';

const PORT = 2000;
const app = express();
const server = http.createServer(app);

// generic socket server to /
const io = new Server(server);

// set up adapter for multiple servers
const pubClient = createClient({ url: "redis://localhost:6379"});
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
});

// opens up a specific namespace. if not defined, unable to connect
const nameSpaceIO = io.of('/somePlace');

const responseHandler = function(req, res, next) {
    console.log(io.sockets);

    req.io.emit("message",'sent from inside an endpoint')
    res.send("Welcome")
    next();
};

// attach io object for immediate usage 
app.use((req, res, next) => {
    req.io = io;
    next();
});

app.get('/', [
    responseHandler,
]);

app.use((req, res, next) => {
    // emits a message to all sockets
    io.emit('message', 'here you go')

    // emits a message to all in room1
    io.to('room1').emit('message', 'gotcha!')
    next();
})

io.use((socket, next) => {
    // use middleware functionallity here
    // auth, identifying user etc
    console.log("trying to connect!")
    next(); 
});

io.on('connection', (socket => {
    console.log('Connected via socket');
    
    socket.on('message', (event) => {
        // event is received
        console.log(event);
    });

    socket.on('roomTest', (roomName) => {
        // joins the room
        socket.join(roomName);

        // sends an event to all sockets in the room EXCEPT the initial socket
        socket.to(roomName).emit('message','some event outer')
    });

}))

server.listen(PORT, ()=>{
    console.log(`SERVER now listening to ${PORT}`);
})