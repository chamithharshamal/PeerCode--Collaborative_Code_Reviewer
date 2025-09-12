import { Document, Schema, model } from 'mongoose';

export interface DebateArgumentData {
  id: string;
  content: string;
  type: 'pro' | 'con' | 'neutral';
  confidence: number;
  evidence: string[];
  source: 'ai' | 'user';
  timestamp: Date;
}

export interface IDebateArgument extends Document {
  id: string;
  content: string;
  type: 'pro' | 'con' | 'neutral';
  confidence: number;
  evidence: string[];
  source: 'ai' | 'user';
  timestamp: Date;
}

export interface IDebateSession extends Document {
  id: string;
  codeSnippetId: string;
  sessionId: string;
  topic: string;
  context: {
    codeContext: string;
    userIntent: string;
    previousSuggestions: string[];
  };
  arguments: DebateArgumentData[];
  status: 'active' | 'concluded' | 'abandoned';
  conclusion?: {
    summary: string;
    recommendation: string;
    confidence: number;
    timestamp: Date;
  };
  participants: string[]; // user IDs
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

const debateArgumentSchema = new Schema<DebateArgumentData>({
  id: { type: String, required: true, unique: true },
  content: { type: String, required: true, maxlength: 2000 },
  type: { type: String, required: true, enum: ['pro', 'con', 'neutral'] },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  evidence: [{ type: String, maxlength: 500 }],
  source: { type: String, required: true, enum: ['ai', 'user'] },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const debateSessionSchema = new Schema<IDebateSession>({
  id: { type: String, required: true, unique: true },
  codeSnippetId: { type: String, required: true, index: true },
  sessionId: { type: String, required: true, index: true },
  topic: { type: String, required: true, maxlength: 200 },
  context: {
    codeContext: { type: String, required: true, maxlength: 5000 },
    userIntent: { type: String, maxlength: 1000 },
    previousSuggestions: [{ type: String }]
  },
  arguments: [debateArgumentSchema],
  status: { 
    type: String, 
    required: true, 
    enum: ['active', 'concluded', 'abandoned'],
    default: 'active'
  },
  conclusion: {
    summary: { type: String, maxlength: 2000 },
    recommendation: { type: String, maxlength: 1000 },
    confidence: { type: Number, min: 0, max: 1 },
    timestamp: { type: Date }
  },
  participants: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, expires: 0 } // TTL for cleanup
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
debateSessionSchema.index({ codeSnippetId: 1, status: 1 });
debateSessionSchema.index({ sessionId: 1, status: 1 });
debateSessionSchema.index({ participants: 1 });
debateSessionSchema.index({ createdAt: -1 });

// Virtual for session ID

export const DebateSession = model<IDebateSession>('DebateSession', debateSessionSchema);
