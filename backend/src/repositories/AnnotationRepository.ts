import { Pool } from 'pg';
import { Annotation, AnnotationData } from '../models/Annotation';

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