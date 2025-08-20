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
import codeSnippetRoutes from './routes/codeSnippet';
import sessionRoutes from './routes/session';
import { initializeDatabase, closeConnections } from './config/database';
import { SessionCleanupService } from './services/SessionCleanupService';
import { WebSocketService } from './services/WebSocketService';
import { SessionService } from './services/SessionService';
import { UserService } from './services/UserService';
import { AnnotationService } from './services/AnnotationService';

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
app.use('/api/code-snippets', codeSnippetRoutes);
app.use('/api/sessions', sessionRoutes);

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Initialize services
const sessionService = new SessionService();
const userService = new UserService();
const annotationService = new AnnotationService();
const sessionCleanupService = new SessionCleanupService();

// Initialize WebSocket service
const webSocketService = new WebSocketService(io, sessionService, userService, annotationService);

const startServer = async () => {
  try {
    // Initialize database connections
    await initializeDatabase();
    
    // Start session cleanup service
    sessionCleanupService.start();
    
    // Start server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  sessionCleanupService.stop();
  await closeConnections();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  sessionCleanupService.stop();
  await closeConnections();
  process.exit(0);
});

startServer();
