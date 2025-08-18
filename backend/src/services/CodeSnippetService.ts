import { CodeSnippet } from '../types/index';
import { CodeSnippetModel } from '../models/CodeSnippet';

// In-memory storage for now (will be replaced with database in future tasks)
const codeSnippets = new Map<string, CodeSnippetModel>();

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
    codeSnippets.set(snippet.id, snippet);
    return snippet.toJSON();
  }

  /**
   * Retrieve a code snippet by ID
   */
  async getCodeSnippet(id: string): Promise<CodeSnippet | null> {
    const snippet = codeSnippets.get(id);
    return snippet ? snippet.toJSON() : null;
  }

  /**
   * Delete a code snippet
   */
  async deleteCodeSnippet(id: string): Promise<boolean> {
    return codeSnippets.delete(id);
  }

  /**
   * Get all code snippets (for testing purposes)
   */
  async getAllCodeSnippets(): Promise<CodeSnippet[]> {
    return Array.from(codeSnippets.values()).map(snippet => snippet.toJSON());
  }

  /**
   * Clear all code snippets (for testing purposes)
   */
  async clearAllCodeSnippets(): Promise<void> {
    codeSnippets.clear();
  }
}

export const codeSnippetService = new CodeSnippetService();