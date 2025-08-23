import { v4 as uuidv4 } from 'uuid';

export interface AnnotationData {
  id: string;
  userId: string;
  sessionId: string;
  lineStart: number;
  lineEnd: number;
  columnStart: number;
  columnEnd: number;
  content: string;
  type: 'comment' | 'suggestion' | 'question';
  createdAt: Date;
  updatedAt: Date;
}

export class Annotation {
  public id: string;
  public userId: string;
  public sessionId: string;
  public lineStart: number;
  public lineEnd: number;
  public columnStart: number;
  public columnEnd: number;
  public content: string;
  public type: 'comment' | 'suggestion' | 'question';
  public createdAt: Date;
  public updatedAt: Date;

  constructor(
    userId: string,
    sessionId: string,
    lineStart: number,
    lineEnd: number,
    columnStart: number,
    columnEnd: number,
    content: string,
    type: 'comment' | 'suggestion' | 'question' = 'comment'
  ) {
    this.id = uuidv4();
    this.userId = userId;
    this.sessionId = sessionId;
    this.lineStart = lineStart;
    this.lineEnd = lineEnd;
    this.columnStart = columnStart;
    this.columnEnd = columnEnd;
    this.content = content;
    this.type = type;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  public updateContent(content: string): void {
    this.content = content;
    this.updatedAt = new Date();
  }

  public updatePosition(
    lineStart: number,
    lineEnd: number,
    columnStart: number,
    columnEnd: number
  ): void {
    this.lineStart = lineStart;
    this.lineEnd = lineEnd;
    this.columnStart = columnStart;
    this.columnEnd = columnEnd;
    this.updatedAt = new Date();
  }

  public isValid(): boolean {
    return (
      this.content.trim().length > 0 &&
      this.lineStart >= 0 &&
      this.lineEnd >= this.lineStart &&
      this.columnStart >= 0 &&
      this.columnEnd >= 0 &&
      ['comment', 'suggestion', 'question'].includes(this.type)
    );
  }

  public toJSON(): AnnotationData {
    return {
      id: this.id,
      userId: this.userId,
      sessionId: this.sessionId,
      lineStart: this.lineStart,
      lineEnd: this.lineEnd,
      columnStart: this.columnStart,
      columnEnd: this.columnEnd,
      content: this.content,
      type: this.type,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  public static fromJSON(data: AnnotationData): Annotation {
    const annotation = new Annotation(
      data.userId,
      data.sessionId,
      data.lineStart,
      data.lineEnd,
      data.columnStart,
      data.columnEnd,
      data.content,
      data.type
    );
    annotation.id = data.id;
    annotation.createdAt = data.createdAt;
    annotation.updatedAt = data.updatedAt;
    return annotation;
  }
}