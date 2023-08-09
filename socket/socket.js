const socketIO = require('socket.io');

let io;

function initializeSocket(server) {
  io = socketIO(server);

  io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });
}

function getIO() {
  if (!io) {
    throw new Error('Socket.IO has not been initialized.');
  }
  return io;
}

module.exports = {
  initializeSocket,
  getIO,
};
