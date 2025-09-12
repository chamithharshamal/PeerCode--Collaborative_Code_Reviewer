import { Pool } from 'pg';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis client
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

// Database initialization
export const initializeDatabase = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/collaborative-code-reviewer';
    
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        bufferCommands: false // Disable mongoose buffering
      });
      console.log('MongoDB connected successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('MongoDB connection failed, continuing without MongoDB:', errorMessage);
      console.warn('AI features (suggestions and debates) will not be available');
    }

    // Test PostgreSQL connection
    const client = await pool.connect();
    console.log('PostgreSQL connected successfully');
    
    // Create sessions table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY,
        creator_id UUID NOT NULL,
        code_snippet_id UUID NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        max_participants INTEGER NOT NULL DEFAULT 10,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Create session_participants table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS session_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_active BOOLEAN DEFAULT true,
        UNIQUE(session_id, user_id)
      );
    `);

    // Create annotations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS annotations (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        line_start INTEGER NOT NULL,
        line_end INTEGER NOT NULL,
        column_start INTEGER NOT NULL,
        column_end INTEGER NOT NULL,
        content TEXT NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('comment', 'suggestion', 'question')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Create code_snippets table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS code_snippets (
        id UUID PRIMARY KEY,
        content TEXT NOT NULL,
        language VARCHAR(50) NOT NULL,
        filename VARCHAR(255),
        size INTEGER NOT NULL,
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_creator_id ON sessions(creator_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
      CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity);
      CREATE INDEX IF NOT EXISTS idx_session_participants_session_id ON session_participants(session_id);
      CREATE INDEX IF NOT EXISTS idx_session_participants_user_id ON session_participants(user_id);
      CREATE INDEX IF NOT EXISTS idx_annotations_session_id ON annotations(session_id);
      CREATE INDEX IF NOT EXISTS idx_annotations_user_id ON annotations(user_id);
      CREATE INDEX IF NOT EXISTS idx_annotations_line_range ON annotations(session_id, line_start, line_end);
      CREATE INDEX IF NOT EXISTS idx_annotations_created_at ON annotations(created_at);
      CREATE INDEX IF NOT EXISTS idx_code_snippets_language ON code_snippets(language);
      CREATE INDEX IF NOT EXISTS idx_code_snippets_uploaded_at ON code_snippets(uploaded_at);
      CREATE INDEX IF NOT EXISTS idx_code_snippets_size ON code_snippets(size);
    `);

    client.release();
    console.log('Database tables initialized successfully');

    // Test Redis connection
    await redis.ping();
    console.log('Redis connected successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

// Graceful shutdown
export const closeConnections = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    await pool.end();
    redis.disconnect();
    console.log('Database connections closed');
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
};