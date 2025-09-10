import { Pool } from 'pg';
import Redis from 'ioredis';
import { Server } from 'http';
import { createServer as createHttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import express from 'express';
import cors from 'cors';
import { pool, redis, initializeDatabase } from '../../config/database';
import { AnnotationService } from '../../services/AnnotationService';
import { WebSocketService } from '../../services/WebSocketService';
import { SessionService } from '../../services/SessionService';
import { UserService } from '../../services/UserService';
import { SessionRepository } from '../../repositories/SessionRepository';
import { AnnotationRepository } from '../../repositories/AnnotationRepository';
import { CodeSnippetService } from '../../services/CodeSnippetService';
// JWT_SECRET is not exported, we'll use environment variable

export interface TestSetup {
  app: express.Application;
  server: Server;
  annotationService: AnnotationService;
  webSocketService: WebSocketService;
  sessionService: SessionService;
  userService: UserService;
  sessionRepository: SessionRepository;
  annotationRepository: AnnotationRepository;
  codeSnippetService: CodeSnippetService;
}

export async function createTestServer(): Promise<TestSetup> {
  // Initialize database
  await initializeDatabase();

  // Create repositories
  const sessionRepository = new SessionRepository(pool);
  const annotationRepository = new AnnotationRepository(pool);

  // Create services
  const userService = new UserService();
  const codeSnippetService = new CodeSnippetService();
  const annotationService = new AnnotationService(pool, redis);
  const sessionService = new SessionService(
    redis,
    sessionRepository,
    annotationService,
    userService
  );

  // Create Express app
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Create HTTP server
  const server = createHttpServer(app);

  // Create Socket.IO server
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Create WebSocket service
  const webSocketService = new WebSocketService(io, sessionService, userService, annotationService);

  // Add basic routes for testing
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  return {
    app,
    server,
    annotationService,
    webSocketService,
    sessionService,
    userService,
    sessionRepository,
    annotationRepository,
    codeSnippetService
  };
}

export async function cleanupTestServer(setup: TestSetup): Promise<void> {
  // Close server
  await new Promise<void>((resolve) => {
    setup.server.close(() => resolve());
  });

  // Close database connections
  await pool.end();
  redis.disconnect();
}
