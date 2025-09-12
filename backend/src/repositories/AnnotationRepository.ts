import { Pool } from 'pg';
import { Annotation, AnnotationData } from '../models/Annotation';
import { SearchAnnotationsParams, AnnotationStats } from '../services/AnnotationService';

export class AnnotationRepository {
  constructor(private pool: Pool) {}

  async create(annotation: Annotation): Promise<AnnotationData> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO annotations (
          id, user_id, session_id, line_start, line_end, 
          column_start, column_end, content, type, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const values = [
        annotation.id,
        annotation.userId,
        annotation.sessionId,
        annotation.lineStart,
        annotation.lineEnd,
        annotation.columnStart,
        annotation.columnEnd,
        annotation.content,
        annotation.type,
        annotation.createdAt,
        annotation.updatedAt
      ];

      const result = await client.query(query, values);
      return this.mapRowToAnnotationData(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<AnnotationData | null> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM annotations WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToAnnotationData(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async findBySessionId(sessionId: string): Promise<AnnotationData[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM annotations 
        WHERE session_id = $1 
        ORDER BY created_at ASC
      `;
      const result = await client.query(query, [sessionId]);
      
      return result.rows.map(row => this.mapRowToAnnotationData(row));
    } finally {
      client.release();
    }
  }

  async findByUserId(userId: string): Promise<AnnotationData[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM annotations 
        WHERE user_id = $1 
        ORDER BY created_at DESC
      `;
      const result = await client.query(query, [userId]);
      
      return result.rows.map(row => this.mapRowToAnnotationData(row));
    } finally {
      client.release();
    }
  }

  async update(annotation: Annotation): Promise<AnnotationData> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE annotations 
        SET content = $1, type = $2, line_start = $3, line_end = $4,
            column_start = $5, column_end = $6, updated_at = $7
        WHERE id = $8
        RETURNING *
      `;
      
      const values = [
        annotation.content,
        annotation.type,
        annotation.lineStart,
        annotation.lineEnd,
        annotation.columnStart,
        annotation.columnEnd,
        annotation.updatedAt,
        annotation.id
      ];

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error(`Annotation with id ${annotation.id} not found`);
      }
      
      return this.mapRowToAnnotationData(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const query = 'DELETE FROM annotations WHERE id = $1';
      const result = await client.query(query, [id]);
      
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  async deleteBySessionId(sessionId: string): Promise<number> {
    const client = await this.pool.connect();
    try {
      const query = 'DELETE FROM annotations WHERE session_id = $1';
      const result = await client.query(query, [sessionId]);
      
      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  async findByLineRange(
    sessionId: string, 
    lineStart: number, 
    lineEnd: number
  ): Promise<AnnotationData[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM annotations 
        WHERE session_id = $1 
        AND (
          (line_start >= $2 AND line_start <= $3) OR
          (line_end >= $2 AND line_end <= $3) OR
          (line_start <= $2 AND line_end >= $3)
        )
        ORDER BY line_start ASC, created_at ASC
      `;
      const result = await client.query(query, [sessionId, lineStart, lineEnd]);
      
      return result.rows.map(row => this.mapRowToAnnotationData(row));
    } finally {
      client.release();
    }
  }

  async search(params: SearchAnnotationsParams): Promise<AnnotationData[]> {
    const client = await this.pool.connect();
    try {
      let query = 'SELECT * FROM annotations WHERE 1=1';
      const values: any[] = [];
      let paramIndex = 1;

      if (params.query) {
        query += ` AND content ILIKE $${paramIndex}`;
        values.push(`%${params.query}%`);
        paramIndex++;
      }

      if (params.sessionId) {
        query += ` AND session_id = $${paramIndex}`;
        values.push(params.sessionId);
        paramIndex++;
      }

      if (params.type) {
        query += ` AND type = $${paramIndex}`;
        values.push(params.type);
        paramIndex++;
      }

      if (params.userId) {
        query += ` AND user_id = $${paramIndex}`;
        values.push(params.userId);
        paramIndex++;
      }

      query += ' ORDER BY created_at DESC';

      const result = await client.query(query, values);
      return result.rows.map(row => this.mapRowToAnnotationData(row));
    } finally {
      client.release();
    }
  }

  async getStats(sessionId?: string, userId?: string): Promise<AnnotationStats> {
    const client = await this.pool.connect();
    try {
      let whereClause = 'WHERE 1=1';
      const values: any[] = [];
      let paramIndex = 1;

      if (sessionId) {
        whereClause += ` AND session_id = $${paramIndex}`;
        values.push(sessionId);
        paramIndex++;
      }

      if (userId) {
        whereClause += ` AND user_id = $${paramIndex}`;
        values.push(userId);
        paramIndex++;
      }

      // Get total count
      const totalQuery = `SELECT COUNT(*) as total FROM annotations ${whereClause}`;
      const totalResult = await client.query(totalQuery, values);
      const total = parseInt(totalResult.rows[0].total);

      // Get count by type
      const typeQuery = `
        SELECT type, COUNT(*) as count 
        FROM annotations ${whereClause}
        GROUP BY type
      `;
      const typeResult = await client.query(typeQuery, values);
      
      const byType = {
        comment: 0,
        suggestion: 0,
        question: 0
      };
      
      typeResult.rows.forEach(row => {
        byType[row.type as keyof typeof byType] = parseInt(row.count);
      });

      // Get count by user
      const userQuery = `
        SELECT user_id, COUNT(*) as count 
        FROM annotations ${whereClause}
        GROUP BY user_id
        ORDER BY count DESC
        LIMIT 10
      `;
      const userResult = await client.query(userQuery, values);
      
      const byUser = userResult.rows.map(row => ({
        userId: row.user_id,
        count: parseInt(row.count)
      }));

      // Get recent activity
      const recentQuery = `
        SELECT id, content, type, created_at, user_id
        FROM annotations ${whereClause}
        ORDER BY created_at DESC
        LIMIT 10
      `;
      const recentResult = await client.query(recentQuery, values);
      
      const recentActivity = recentResult.rows.map(row => ({
        id: row.id,
        content: row.content,
        type: row.type,
        createdAt: row.created_at,
        userId: row.user_id
      }));

      return {
        total,
        byType,
        byUser,
        recentActivity
      };
    } finally {
      client.release();
    }
  }

  private mapRowToAnnotationData(row: any): AnnotationData {
    return {
      id: row.id,
      userId: row.user_id,
      sessionId: row.session_id,
      lineStart: row.line_start,
      lineEnd: row.line_end,
      columnStart: row.column_start,
      columnEnd: row.column_end,
      content: row.content,
      type: row.type,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}