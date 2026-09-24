require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');

const dns = require("node:dns")
dns.setServers(['8.8.8.8', '8.8.4.4'])

const reminderRoutes = require('./routes/reminderRoutes');
const friendRoutes = require('./routes/friendRoutes');

const notificationRoutes = require('./routes/notificationRoutes');
const http = require('http');
const socketConfig = require('./socket');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

const app = express(); 
const server = http.createServer(app);
const io = socketConfig.init(server);

// Socket.io middleware for auth
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return next(new Error('User not found'));
    
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.user.name);
  // Join private room
  socket.join(socket.user._id.toString());
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.user.name);
  });
});

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || '*' })); 
app.use(express.json()); 

const commentRoutes = require('./routes/commentRoutes');
const { startScheduler } = require('./scheduler');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/reminders', commentRoutes); // Mounts /api/reminders/:reminderId/comments
app.use('/api/friends', friendRoutes);
app.use('/api/notifications', notificationRoutes);

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected successfully');
    startScheduler(); // Start scheduler after DB connection
  })
  .catch((err) => console.log('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
