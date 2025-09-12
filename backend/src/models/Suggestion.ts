import { Document, Schema, model } from 'mongoose';

export interface ISuggestion extends Document {
  id: string;
  codeSnippetId: string;
  sessionId: string;
  userId: string;
  type: 'improvement' | 'bug_fix' | 'optimization' | 'refactoring' | 'security' | 'style';
  category: 'performance' | 'maintainability' | 'security' | 'style' | 'bugs';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  codeExample?: string;
  explanation: string;
  confidence: number; // 0-1
  lineNumber?: number;
  columnRange?: { start: number; end: number };
  tags: string[];
  status: 'pending' | 'accepted' | 'rejected' | 'implemented' | 'dismissed';
  userFeedback?: {
    rating: number; // 1-5
    comment?: string;
    timestamp: Date;
  };
  aiModel: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

const suggestionSchema = new Schema<ISuggestion>({
  id: { type: String, required: true, unique: true },
  codeSnippetId: { type: String, required: true, index: true },
  sessionId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['improvement', 'bug_fix', 'optimization', 'refactoring', 'security', 'style'] 
  },
  category: { 
    type: String, 
    required: true, 
    enum: ['performance', 'maintainability', 'security', 'style', 'bugs'] 
  },
  severity: { 
    type: String, 
    required: true, 
    enum: ['low', 'medium', 'high'] 
  },
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, required: true, maxlength: 1000 },
  codeExample: { type: String, maxlength: 2000 },
  explanation: { type: String, required: true, maxlength: 2000 },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  lineNumber: { type: Number, min: 1 },
  columnRange: {
    start: { type: Number, min: 0 },
    end: { type: Number, min: 0 }
  },
  tags: [{ type: String, maxlength: 50 }],
  status: { 
    type: String, 
    required: true, 
    enum: ['pending', 'accepted', 'rejected', 'implemented', 'dismissed'],
    default: 'pending'
  },
  userFeedback: {
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String, maxlength: 500 },
    timestamp: { type: Date, default: Date.now }
  },
  aiModel: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, expires: 0 } // TTL for cleanup
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
suggestionSchema.index({ codeSnippetId: 1, status: 1 });
suggestionSchema.index({ sessionId: 1, status: 1 });
suggestionSchema.index({ userId: 1, status: 1 });
suggestionSchema.index({ category: 1, severity: 1 });
suggestionSchema.index({ createdAt: -1 });
suggestionSchema.index({ confidence: -1 });

// Virtual for suggestion ID

export const Suggestion = model<ISuggestion>('Suggestion', suggestionSchema);
