import { Suggestion, ISuggestion } from '../models/Suggestion';
import { SuggestionInteraction, ISuggestionInteraction } from '../models/SuggestionInteraction';
import { InMemoryStorage } from './InMemoryStorage';
import { v4 as uuidv4 } from 'uuid';

export interface CreateSuggestionData {
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
  confidence: number;
  lineNumber?: number;
  columnRange?: { start: number; end: number };
  tags: string[];
  aiModel: string;
}

// Interface for in-memory suggestion data
export interface SuggestionData {
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
  confidence: number;
  lineNumber?: number;
  columnRange?: { start: number; end: number };
  tags: string[];
  status: 'pending' | 'accepted' | 'rejected' | 'implemented' | 'dismissed';
  userFeedback?: {
    rating: number;
    comment?: string;
    timestamp: Date;
  };
  aiModel: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export interface SuggestionFilters {
  codeSnippetId?: string;
  sessionId?: string;
  userId?: string;
  type?: string[];
  category?: string[];
  severity?: string[];
  status?: string[];
  tags?: string[];
  minConfidence?: number;
  maxConfidence?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface SuggestionSortOptions {
  field: 'createdAt' | 'confidence' | 'severity' | 'title';
  order: 'asc' | 'desc';
}

export interface SuggestionAnalytics {
  totalSuggestions: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  averageConfidence: number;
  acceptanceRate: number;
  topTags: Array<{ tag: string; count: number }>;
  recentActivity: Array<{
    date: string;
    suggestions: number;
    interactions: number;
  }>;
}

export class SuggestionService {
  private inMemoryStorage: InMemoryStorage;
  private useInMemory: boolean = false;

  constructor() {
    this.inMemoryStorage = InMemoryStorage.getInstance();
    // Check if MongoDB is available
    this.checkMongoDBConnection();
  }

  private async checkMongoDBConnection(): Promise<void> {
    try {
      await Suggestion.findOne().limit(1);
    } catch (error) {
      console.warn('MongoDB not available, using in-memory storage for suggestions');
      this.useInMemory = true;
    }
  }

  async createSuggestion(data: CreateSuggestionData): Promise<ISuggestion> {
    try {
      if (this.useInMemory) {
        const suggestion: SuggestionData = {
          id: uuidv4(),
          ...data,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        };
        
        this.inMemoryStorage.save(`suggestion_${suggestion.id}`, suggestion);
        return suggestion as unknown as ISuggestion;
      }

      const suggestion = new Suggestion({
        id: uuidv4(),
        ...data,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });

      return await suggestion.save();
    } catch (error) {
      console.error('Error creating suggestion:', error);
      throw new Error('Failed to create suggestion: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async getSuggestions(
    filters: SuggestionFilters = {},
    sort: SuggestionSortOptions = { field: 'createdAt', order: 'desc' },
    limit: number = 50,
    offset: number = 0
  ): Promise<{ suggestions: ISuggestion[]; total: number }> {
    const query: any = {};

    // Apply filters
    if (filters.codeSnippetId) query.codeSnippetId = filters.codeSnippetId;
    if (filters.sessionId) query.sessionId = filters.sessionId;
    if (filters.userId) query.userId = filters.userId;
    if (filters.type && filters.type.length > 0) query.type = { $in: filters.type };
    if (filters.category && filters.category.length > 0) query.category = { $in: filters.category };
    if (filters.severity && filters.severity.length > 0) query.severity = { $in: filters.severity };
    if (filters.status && filters.status.length > 0) query.status = { $in: filters.status };
    if (filters.tags && filters.tags.length > 0) query.tags = { $in: filters.tags };
    if (filters.minConfidence !== undefined) query.confidence = { ...query.confidence, $gte: filters.minConfidence };
    if (filters.maxConfidence !== undefined) query.confidence = { ...query.confidence, $lte: filters.maxConfidence };
    if (filters.dateFrom) query.createdAt = { ...query.createdAt, $gte: filters.dateFrom };
    if (filters.dateTo) query.createdAt = { ...query.createdAt, $lte: filters.dateTo };

    const sortObj: any = {};
    sortObj[sort.field] = sort.order === 'asc' ? 1 : -1;

    const [suggestions, total] = await Promise.all([
      Suggestion.find(query)
        .sort(sortObj)
        .limit(limit)
        .skip(offset)
        .lean(),
      Suggestion.countDocuments(query)
    ]);

    return { suggestions: suggestions as ISuggestion[], total };
  }

  async getSuggestionById(id: string): Promise<ISuggestion | null> {
    return await Suggestion.findOne({ id }).lean();
  }

  async updateSuggestionStatus(
    id: string, 
    status: 'pending' | 'accepted' | 'rejected' | 'implemented' | 'dismissed',
    userId: string
  ): Promise<ISuggestion | null> {
    return await Suggestion.findOneAndUpdate(
      { id, userId },
      { status, updatedAt: new Date() },
      { new: true }
    ).lean();
  }

  async addUserFeedback(
    id: string,
    userId: string,
    rating: number,
    comment?: string
  ): Promise<ISuggestion | null> {
    return await Suggestion.findOneAndUpdate(
      { id, userId },
      {
        'userFeedback.rating': rating,
        'userFeedback.comment': comment,
        'userFeedback.timestamp': new Date(),
        updatedAt: new Date()
      },
      { new: true }
    ).lean();
  }

  async trackInteraction(
    suggestionId: string,
    userId: string,
    sessionId: string,
    action: 'view' | 'accept' | 'reject' | 'implement' | 'dismiss' | 'rate' | 'comment',
    details?: any
  ): Promise<ISuggestionInteraction> {
    const interaction = new SuggestionInteraction({
      id: uuidv4(),
      suggestionId,
      userId,
      sessionId,
      action,
      details,
      timestamp: new Date()
    });

    return await interaction.save();
  }

  async getSuggestionAnalytics(
    filters: SuggestionFilters = {},
    timeRange: { from: Date; to: Date } = {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date()
    }
  ): Promise<SuggestionAnalytics> {
    const query: any = {
      createdAt: { $gte: timeRange.from, $lte: timeRange.to }
    };

    // Apply additional filters
    if (filters.codeSnippetId) query.codeSnippetId = filters.codeSnippetId;
    if (filters.sessionId) query.sessionId = filters.sessionId;
    if (filters.userId) query.userId = filters.userId;

    const [
      totalSuggestions,
      statusCounts,
      categoryCounts,
      severityCounts,
      typeCounts,
      avgConfidence,
      acceptanceRate,
      topTags,
      recentActivity
    ] = await Promise.all([
      Suggestion.countDocuments(query),
      Suggestion.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Suggestion.aggregate([
        { $match: query },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      Suggestion.aggregate([
        { $match: query },
        { $group: { _id: '$severity', count: { $sum: 1 } } }
      ]),
      Suggestion.aggregate([
        { $match: query },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      Suggestion.aggregate([
        { $match: query },
        { $group: { _id: null, avgConfidence: { $avg: '$confidence' } } }
      ]),
      this.calculateAcceptanceRate(query),
      this.getTopTags(query),
      this.getRecentActivity(query, timeRange)
    ]);

    return {
      totalSuggestions,
      byStatus: this.formatAggregationResults(statusCounts),
      byCategory: this.formatAggregationResults(categoryCounts),
      bySeverity: this.formatAggregationResults(severityCounts),
      byType: this.formatAggregationResults(typeCounts),
      averageConfidence: avgConfidence[0]?.avgConfidence || 0,
      acceptanceRate,
      topTags,
      recentActivity
    };
  }

  private async calculateAcceptanceRate(query: any): Promise<number> {
    const [total, accepted] = await Promise.all([
      Suggestion.countDocuments(query),
      Suggestion.countDocuments({ ...query, status: 'accepted' })
    ]);

    return total > 0 ? accepted / total : 0;
  }

  private async getTopTags(query: any): Promise<Array<{ tag: string; count: number }>> {
    const result = await Suggestion.aggregate([
      { $match: query },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    return result.map((item: any) => ({ tag: item._id, count: item.count }));
  }

  private async getRecentActivity(
    query: any, 
    timeRange: { from: Date; to: Date }
  ): Promise<Array<{ date: string; suggestions: number; interactions: number }>> {
    const [suggestions, interactions] = await Promise.all([
      Suggestion.aggregate([
        { $match: query },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      SuggestionInteraction.aggregate([
        { 
          $match: { 
            timestamp: { $gte: timeRange.from, $lte: timeRange.to } 
          } 
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const activityMap = new Map<string, { suggestions: number; interactions: number }>();

    suggestions.forEach((item: any) => {
      activityMap.set(item._id, { suggestions: item.count, interactions: 0 });
    });

    interactions.forEach((item: any) => {
      const existing = activityMap.get(item._id) || { suggestions: 0, interactions: 0 };
      activityMap.set(item._id, { ...existing, interactions: item.count });
    });

    return Array.from(activityMap.entries()).map(([date, counts]) => ({
      date,
      ...counts
    }));
  }

  private formatAggregationResults(results: any[]): Record<string, number> {
    const formatted: Record<string, number> = {};
    results.forEach((item: any) => {
      formatted[item._id] = item.count;
    });
    return formatted;
  }

  async deleteSuggestion(id: string, userId: string): Promise<boolean> {
    const result = await Suggestion.deleteOne({ id, userId });
    return result.deletedCount > 0;
  }

  async getSuggestionsByCodeSnippet(codeSnippetId: string): Promise<ISuggestion[]> {
    return await Suggestion.find({ codeSnippetId })
      .sort({ confidence: -1, createdAt: -1 })
      .lean();
  }

  async getSuggestionsBySession(sessionId: string): Promise<ISuggestion[]> {
    return await Suggestion.find({ sessionId })
      .sort({ confidence: -1, createdAt: -1 })
      .lean();
  }
}
