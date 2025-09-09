import { CodeSnippet } from '../types/index';
import { CodeSnippetModel } from '../models/CodeSnippet';
import { pool } from '../config/database';

export class CodeSnippetService {
  /**
   * Store a code snippet
   */
  async storeCodeSnippet(
    content: string,
    language: string,
    filename?: string
  ): Promise<CodeSnippet> {
    const snippet = new CodeSnippetModel(content, language, filename);
    
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO code_snippets (id, content, language, filename, size, uploaded_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          snippet.id,
          snippet.content,
          snippet.language,
          snippet.filename,
          snippet.size,
          snippet.uploadedAt
        ]
      );
      
    return snippet.toJSON();
    } finally {
      client.release();
    }
  }

  /**
   * Retrieve a code snippet by ID
   */
  async getCodeSnippet(id: string): Promise<CodeSnippet | null> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, content, language, filename, size, uploaded_at
         FROM code_snippets WHERE id = $1`,
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        content: row.content,
        language: row.language,
        filename: row.filename,
        size: row.size,
        uploadedAt: row.uploaded_at
      };
    } finally {
      client.release();
    }
  }

  /**
   * Delete a code snippet
   */
  async deleteCodeSnippet(id: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM code_snippets WHERE id = $1',
        [id]
      );
      
      return (result.rowCount ?? 0) > 0;
    } finally {
      client.release();
    }
  }

  /**
   * Get all code snippets (for testing purposes)
   */
  async getAllCodeSnippets(): Promise<CodeSnippet[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, content, language, filename, size, uploaded_at
         FROM code_snippets ORDER BY uploaded_at DESC`
      );
      
      return result.rows.map(row => ({
        id: row.id,
        content: row.content,
        language: row.language,
        filename: row.filename,
        size: row.size,
        uploadedAt: row.uploaded_at
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Get code snippets by language
   */
  async getCodeSnippetsByLanguage(language: string): Promise<CodeSnippet[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, content, language, filename, size, uploaded_at
         FROM code_snippets WHERE language = $1 ORDER BY uploaded_at DESC`,
        [language]
      );
      
      return result.rows.map(row => ({
        id: row.id,
        content: row.content,
        language: row.language,
        filename: row.filename,
        size: row.size,
        uploadedAt: row.uploaded_at
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Search code snippets by content
   */
  async searchCodeSnippets(query: string): Promise<CodeSnippet[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, content, language, filename, size, uploaded_at
         FROM code_snippets 
         WHERE content ILIKE $1 OR filename ILIKE $1
         ORDER BY uploaded_at DESC`,
        [`%${query}%`]
      );
      
      return result.rows.map(row => ({
        id: row.id,
        content: row.content,
        language: row.language,
        filename: row.filename,
        size: row.size,
        uploadedAt: row.uploaded_at
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Update a code snippet
   */
  async updateCodeSnippet(id: string, updates: Partial<CodeSnippet>): Promise<CodeSnippet | null> {
    const client = await pool.connect();
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (updates.content !== undefined) {
        fields.push(`content = $${paramCount++}`);
        values.push(updates.content);
      }
      if (updates.language !== undefined) {
        fields.push(`language = $${paramCount++}`);
        values.push(updates.language);
      }
      if (updates.filename !== undefined) {
        fields.push(`filename = $${paramCount++}`);
        values.push(updates.filename);
      }
      
      if (fields.length === 0) {
        return await this.getCodeSnippet(id);
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const result = await client.query(
        `UPDATE code_snippets SET ${fields.join(', ')} WHERE id = $${paramCount}`,
        values
      );

      if ((result.rowCount ?? 0) === 0) {
        return null;
      }

      return await this.getCodeSnippet(id);
    } finally {
      client.release();
    }
  }

  /**
   * Clear all code snippets (for testing purposes)
   */
  async clearAllCodeSnippets(): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM code_snippets');
    } finally {
      client.release();
    }
  }
}

export const codeSnippetService = new CodeSnippetService();