import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from './types/socket';
import { Session } from './types/index';
import authRoutes from './routes/auth';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
  server,
  {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  }
);

const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join-session', (data) => {
    console.log(`User ${data.userId} joining session ${data.sessionId}`);
    socket.data.userId = data.userId;
    socket.data.sessionId = data.sessionId;
    socket.join(data.sessionId);

    // TODO: Implement session joining logic
    socket.emit('session-joined', {
      participants: [],
      sessionState: {
        session: {} as Session,
        activeParticipants: [],
        currentAnnotations: [],
        aiSuggestions: [],
        debateMode: false,
      },
    });
  });

  socket.on('add-annotation', (data) => {
    console.log(`Annotation added in session ${data.sessionId}`);
    // TODO: Implement annotation logic
    socket.to(data.sessionId).emit('annotation-added', {
      annotation: data.annotation,
      userId: socket.data.userId!,
    });
  });

  socket.on('highlight-code', (data) => {
    console.log(`Code highlighted in session ${data.sessionId}`);
    socket.to(data.sessionId).emit('code-highlighted', {
      range: data.range,
      userId: socket.data.userId!,
    });
  });

  socket.on('typing-indicator', (data) => {
    socket.to(data.sessionId).emit('typing-indicator', {
      userId: socket.data.userId!,
      isTyping: data.isTyping,
    });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    if (socket.data.sessionId) {
      socket.leave(socket.data.sessionId);
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
