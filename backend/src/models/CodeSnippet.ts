import { v4 as uuidv4 } from 'uuid';
import { CodeSnippet } from '../types/index';

export class CodeSnippetModel implements CodeSnippet {
  id: string;
  content: string;
  language: string;
  filename?: string;
  size: number;
  uploadedAt: Date;

  constructor(
    content: string,
    language: string,
    filename?: string
  ) {
    this.id = uuidv4();
    this.content = content;
    this.language = language;
    this.filename = filename;
    this.size = Buffer.byteLength(content, 'utf8');
    this.uploadedAt = new Date();
  }

  static fromObject(obj: CodeSnippet): CodeSnippetModel {
    const snippet = new CodeSnippetModel(obj.content, obj.language, obj.filename);
    snippet.id = obj.id;
    snippet.size = obj.size;
    snippet.uploadedAt = obj.uploadedAt;
    return snippet;
  }

  toJSON(): CodeSnippet {
    return {
      id: this.id,
      content: this.content,
      language: this.language,
      filename: this.filename,
      size: this.size,
      uploadedAt: this.uploadedAt,
    };
  }
}