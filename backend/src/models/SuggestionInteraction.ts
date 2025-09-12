import { Document, Schema, model } from 'mongoose';

export interface ISuggestionInteraction extends Document {
  id: string;
  suggestionId: string;
  userId: string;
  sessionId: string;
  action: 'view' | 'accept' | 'reject' | 'implement' | 'dismiss' | 'rate' | 'comment';
  details?: {
    rating?: number;
    comment?: string;
    implementationNotes?: string;
    timeSpent?: number; // in seconds
  };
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
}

const suggestionInteractionSchema = new Schema<ISuggestionInteraction>({
  id: { type: String, required: true, unique: true },
  suggestionId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  sessionId: { type: String, required: true, index: true },
  action: { 
    type: String, 
    required: true, 
    enum: ['view', 'accept', 'reject', 'implement', 'dismiss', 'rate', 'comment'] 
  },
  details: {
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String, maxlength: 500 },
    implementationNotes: { type: String, maxlength: 1000 },
    timeSpent: { type: Number, min: 0 }
  },
  timestamp: { type: Date, default: Date.now, index: true },
  userAgent: { type: String, maxlength: 500 },
  ipAddress: { type: String, maxlength: 45 }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for analytics
suggestionInteractionSchema.index({ suggestionId: 1, action: 1 });
suggestionInteractionSchema.index({ userId: 1, timestamp: -1 });
suggestionInteractionSchema.index({ sessionId: 1, action: 1 });
suggestionInteractionSchema.index({ timestamp: -1 });

// Virtual for interaction ID

export const SuggestionInteraction = model<ISuggestionInteraction>('SuggestionInteraction', suggestionInteractionSchema);
