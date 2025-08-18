import { Pool, PoolClient } from 'pg';
import { Session, SessionState, SessionParticipant } from '../models/Session';
import { pool } from '../config/database';

export class SessionRepository {
  private pool: Pool;

  constructor(dbPool: Pool = pool) {
    this.pool = dbPool;
  }

  async create(session: Session): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Insert session
      await client.query(
        `INSERT INTO sessions (id, creator_id, code_snippet_id, status, max_participants, created_at, updated_at, last_activity)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          session.id,
          session.creatorId,
          session.codeSnippetId,
          session.status,
          session.maxParticipants,
          session.createdAt,
          session.updatedAt,
          session.lastActivity
        ]
      );

      // Insert participants
      for (const participant of session.participants) {
        await client.query(
          `INSERT INTO session_participants (session_id, user_id, joined_at, is_active)
           VALUES ($1, $2, $3, $4)`,
          [session.id, participant.userId, participant.joinedAt, participant.isActive]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(sessionId: string): Promise<Session | null> {
    const client = await this.pool.connect();
    try {
      // Get session data
      const sessionResult = await client.query(
        `SELECT id, creator_id, code_snippet_id, status, max_participants, created_at, updated_at, last_activity
         FROM sessions WHERE id = $1`,
        [sessionId]
      );

      if (sessionResult.rows.length === 0) {
        return null;
      }

      const sessionData = sessionResult.rows[0];

      // Get participants
      const participantsResult = await client.query(
        `SELECT user_id, joined_at, is_active
         FROM session_participants WHERE session_id = $1`,
        [sessionId]
      );

      const participants: SessionParticipant[] = participantsResult.rows.map(row => ({
        userId: row.user_id,
        joinedAt: row.joined_at,
        isActive: row.is_active
      }));

      const sessionState: SessionState = {
        id: sessionData.id,
        creatorId: sessionData.creator_id,
        codeSnippetId: sessionData.code_snippet_id,
        participants,
        status: sessionData.status,
        createdAt: sessionData.created_at,
        updatedAt: sessionData.updated_at,
        lastActivity: sessionData.last_activity,
        maxParticipants: sessionData.max_participants
      };

      return Session.fromJSON(sessionState);
    } finally {
      client.release();
    }
  }

  async update(session: Session): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Update session
      await client.query(
        `UPDATE sessions 
         SET status = $2, updated_at = $3, last_activity = $4
         WHERE id = $1`,
        [session.id, session.status, session.updatedAt, session.lastActivity]
      );

      // Update participants - delete and re-insert for simplicity
      await client.query(
        'DELETE FROM session_participants WHERE session_id = $1',
        [session.id]
      );

      for (const participant of session.participants) {
        await client.query(
          `INSERT INTO session_participants (session_id, user_id, joined_at, is_active)
           VALUES ($1, $2, $3, $4)`,
          [session.id, participant.userId, participant.joinedAt, participant.isActive]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(sessionId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
    } finally {
      client.release();
    }
  }

  async findByUserId(userId: string): Promise<Session[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT DISTINCT s.id, s.creator_id, s.code_snippet_id, s.status, s.max_participants, 
                s.created_at, s.updated_at, s.last_activity
         FROM sessions s
         JOIN session_participants sp ON s.id = sp.session_id
         WHERE sp.user_id = $1 AND sp.is_active = true
         ORDER BY s.last_activity DESC`,
        [userId]
      );

      const sessions: Session[] = [];
      for (const row of result.rows) {
        const session = await this.findById(row.id);
        if (session) {
          sessions.push(session);
        }
      }

      return sessions;
    } finally {
      client.release();
    }
  }

  async findExpiredSessions(timeoutMinutes: number = 60): Promise<string[]> {
    const client = await this.pool.connect();
    try {
      const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);
      const result = await client.query(
        `SELECT id FROM sessions 
         WHERE last_activity < $1 AND status = 'active'`,
        [cutoffTime]
      );

      return result.rows.map(row => row.id);
    } finally {
      client.release();
    }
  }

  async updateLastActivity(sessionId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `UPDATE sessions SET last_activity = NOW(), updated_at = NOW() WHERE id = $1`,
        [sessionId]
      );
    } finally {
      client.release();
    }
  }
}