require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  methods: ['GET', 'POST']
}));

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    methods: ['GET', 'POST']
  }
});

// Store connected users
const users = new Map();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle new user joining
  socket.on('join', (username) => {
    users.set(socket.id, { username });
    io.emit('userList', Array.from(users.values()));
    io.emit('notification', {
      type: 'user-joined',
      username,
      timestamp: new Date()
    });
  });

  // Handle new message
  socket.on('sendMessage', (message) => {
    const user = users.get(socket.id);
    if (user) {
      io.emit('newMessage', {
        username: user.username,
        text: message,
        timestamp: new Date()
      });
    }
  });

  // Handle typing indicator
  socket.on('typing', (isTyping) => {
    const user = users.get(socket.id);
    if (user) {
      socket.broadcast.emit('userTyping', {
        username: user.username,
        isTyping
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      users.delete(socket.id);
      io.emit('userList', Array.from(users.values()));
      io.emit('notification', {
        type: 'user-left',
        username: user.username,
        timestamp: new Date()
      });
    }
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
