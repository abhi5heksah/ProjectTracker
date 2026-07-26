const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const dotenv = require('dotenv');
const helmet = require('helmet');
const { Server } = require('socket.io');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const flowRoutes = require('./routes/flowRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
app.use(helmet());
const server = http.createServer(app);

// CORS config
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/flows', flowRoutes);

// Basic health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Global Error Handler
app.use(errorHandler);

const socketAuth = require('./sockets/socketAuth');
const prisma = require('./services/db');

// Socket.io Setup
const io = new Server(server, {
  cors: corsOptions,
});

io.use(socketAuth);

io.on('connection', (socket) => {
  console.log('User connected to socket:', socket.user.userId);

  socket.on('joinProject', async (projectId) => {
    // Quick auth check to see if user has access to this project
    try {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      let hasAccess = false;
      if (project && project.ownerId === socket.user.userId) {
        hasAccess = true;
      } else {
        const member = await prisma.projectMember.findUnique({
          where: { projectId_userId: { projectId, userId: socket.user.userId } }
        });
        if (member) hasAccess = true;
      }

      if (hasAccess) {
        socket.join(`project:${projectId}`);
        console.log(`User ${socket.user.userId} joined project:${projectId}`);
      } else {
        socket.emit('error', 'Access denied to project');
      }
    } catch (err) {
      console.error('Socket join error:', err);
    }
  });

  socket.on('flowUpdate', ({ projectId, type, changes }) => {
    // Broadcast changes to everyone else in the project room
    socket.to(`project:${projectId}`).emit('flowChange', { type, changes });
  });

  socket.on('leaveProject', (projectId) => {
    socket.leave(`project:${projectId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.user.userId);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
