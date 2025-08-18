import { v4 as uuidv4 } from 'uuid';

export interface SessionParticipant {
  userId: string;
  joinedAt: Date;
  isActive: boolean;
}

export interface SessionState {
  id: string;
  creatorId: string;
  codeSnippetId: string;
  participants: SessionParticipant[];
  status: 'active' | 'paused' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  lastActivity: Date;
  maxParticipants: number;
}

export class Session {
  public id: string;
  public creatorId: string;
  public codeSnippetId: string;
  public participants: SessionParticipant[];
  public status: 'active' | 'paused' | 'completed';
  public createdAt: Date;
  public updatedAt: Date;
  public lastActivity: Date;
  public maxParticipants: number;

  constructor(
    creatorId: string,
    codeSnippetId: string,
    maxParticipants: number = 10
  ) {
    this.id = uuidv4();
    this.creatorId = creatorId;
    this.codeSnippetId = codeSnippetId;
    this.participants = [{
      userId: creatorId,
      joinedAt: new Date(),
      isActive: true
    }];
    this.status = 'active';
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.lastActivity = new Date();
    this.maxParticipants = maxParticipants;
  }

  public addParticipant(userId: string): boolean {
    if (this.participants.length >= this.maxParticipants) {
      return false;
    }

    const existingParticipant = this.participants.find(p => p.userId === userId);
    if (existingParticipant) {
      existingParticipant.isActive = true;
      return true;
    }

    this.participants.push({
      userId,
      joinedAt: new Date(),
      isActive: true
    });
    this.updateActivity();
    return true;
  }

  public removeParticipant(userId: string): void {
    const participant = this.participants.find(p => p.userId === userId);
    if (participant) {
      participant.isActive = false;
      this.updateActivity();
    }
  }

  public getActiveParticipants(): SessionParticipant[] {
    return this.participants.filter(p => p.isActive);
  }

  public updateActivity(): void {
    this.lastActivity = new Date();
    this.updatedAt = new Date();
  }

  public isExpired(timeoutMinutes: number = 60): boolean {
    const now = new Date();
    const timeDiff = now.getTime() - this.lastActivity.getTime();
    return timeDiff > (timeoutMinutes * 60 * 1000);
  }

  public toJSON(): SessionState {
    return {
      id: this.id,
      creatorId: this.creatorId,
      codeSnippetId: this.codeSnippetId,
      participants: this.participants,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastActivity: this.lastActivity,
      maxParticipants: this.maxParticipants
    };
  }

  public static fromJSON(data: SessionState): Session {
    const session = new Session(data.creatorId, data.codeSnippetId, data.maxParticipants);
    session.id = data.id;
    session.participants = data.participants;
    session.status = data.status;
    session.createdAt = data.createdAt;
    session.updatedAt = data.updatedAt;
    session.lastActivity = data.lastActivity;
    return session;
  }
}