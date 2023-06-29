require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const apiRouter = require('./routers/apiv1');
const http = require('http');
const socketio = require('socket.io');

const morgan = require('morgan');

const app = express();
app.use(cors());

// Cấu hình server http và socket.io
const server = http.createServer(app);
const io = socketio(server);

io.on('connection', socket => {
    console.log('New WebSocket connection');
    socket.on('customEvent', data => {
        console.log(data);
    });
    socket.emit('serverEvent', { data: 'Hello from server' });
});

mongoose.connect(process.env.MONGODB_URI, {useNewUrlParser: true, useUnifiedTopology: true})
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.log(err));

app.use(express.json());
app.use(morgan('dev'));
app.use('/api/user', apiRouter);

server.listen(process.env.PORT, () => console.log(`Server started on port ${process.env.PORT}`));
