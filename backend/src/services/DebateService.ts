import { DebateSession, IDebateSession, IDebateArgument, DebateArgumentData } from '../models/DebateSession';
import { SuggestionService } from './SuggestionService';
import { AIAnalysisService } from './AIAnalysisService';
import { InMemoryStorage } from './InMemoryStorage';
import { v4 as uuidv4 } from 'uuid';

export interface CreateDebateSessionData {
  codeSnippetId: string;
  sessionId: string;
  topic: string;
  codeContext: string;
  userIntent?: string;
  previousSuggestions?: string[];
  participants: string[];
}

// Interface for in-memory debate session data
export interface DebateSessionData {
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
  participants: string[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export interface DebateArgumentInput {
  content: string;
  type: 'pro' | 'con' | 'neutral';
  confidence: number;
  evidence: string[];
  source: 'ai' | 'user';
}

export interface DebateContext {
  codeContext: string;
  userIntent: string;
  previousSuggestions: string[];
  currentArguments: IDebateArgument[];
  debateHistory: string[];
}
export class DebateService {
  private suggestionService!: SuggestionService;
  private aiAnalysisService!: AIAnalysisService;
  private inMemoryStorage!: InMemoryStorage;
  private useInMemory: boolean = false;

  constructor() {
    try {
      this.suggestionService = new SuggestionService();
      this.aiAnalysisService = new AIAnalysisService();
      this.inMemoryStorage = InMemoryStorage.getInstance();
      // Check if MongoDB is available
      this.checkMongoDBConnection();
    } catch (error) {
      console.error('Error in DebateService constructor:', error);
      this.useInMemory = true; // Force in-memory mode if constructor fails
    }
  }

  private async checkMongoDBConnection(): Promise<void> {
    try {
      await DebateSession.findOne().limit(1);
    } catch (error) {
      console.warn('MongoDB not available, using in-memory storage for debates');
      this.useInMemory = true;
    }
  }

  async createDebateSession(data: CreateDebateSessionData): Promise<IDebateSession> {
    try {
      if (this.useInMemory) {
        const debateSession: DebateSessionData = {
          id: uuidv4(),
          codeSnippetId: data.codeSnippetId,
          sessionId: data.sessionId,
          topic: data.topic,
          context: {
            codeContext: data.codeContext,
            userIntent: data.userIntent || '',
            previousSuggestions: data.previousSuggestions || []
          },
          arguments: [],
          status: 'active',
          participants: data.participants,
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        };
        
        this.inMemoryStorage.save(`debate_${debateSession.id}`, debateSession);
        return debateSession as unknown as IDebateSession;
      }

      const debateSession = new DebateSession({
        id: uuidv4(),
        ...data,
        context: {
          codeContext: data.codeContext,
          userIntent: data.userIntent || '',
          previousSuggestions: data.previousSuggestions || []
        },
        arguments: [],
        status: 'active',
        participants: data.participants,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });

      return await debateSession.save();
    } catch (error) {
      console.error('Error creating debate session:', error);
      throw new Error('Failed to create debate session: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async getDebateSession(id: string): Promise<IDebateSession | null> {
    return await DebateSession.findOne({ id }).lean();
  }

  async getActiveDebateSessions(sessionId: string): Promise<IDebateSession[]> {
    return await DebateSession.find({ 
      sessionId, 
      status: 'active' 
    }).sort({ createdAt: -1 }).lean();
  }

  async generateInitialArguments(
    debateSessionId: string,
    topic: string,
    codeContext: string
  ): Promise<DebateArgumentData[]> {
    const debateSession = await this.getDebateSession(debateSessionId);
    if (!debateSession) {
      throw new Error('Debate session not found');
    }

    try {
      // Generate pro and con arguments using AI
      const [proArguments, conArguments] = await Promise.all([
        this.generateArgumentsForPosition(topic, codeContext, 'pro'),
        this.generateArgumentsForPosition(topic, codeContext, 'con')
      ]);

      const debateArguments: DebateArgumentData[] = [
        ...proArguments.map(arg => ({
          id: uuidv4(),
          content: arg.content,
          type: 'pro' as const,
          confidence: arg.confidence,
          evidence: arg.evidence,
          source: 'ai' as const,
          timestamp: new Date()
        })),
        ...conArguments.map(arg => ({
          id: uuidv4(),
          content: arg.content,
          type: 'con' as const,
          confidence: arg.confidence,
          evidence: arg.evidence,
          source: 'ai' as const,
          timestamp: new Date()
        }))
      ];

      // Update the debate session with initial arguments
      await DebateSession.findOneAndUpdate(
        { id: debateSessionId },
        { 
          $push: { arguments: { $each: debateArguments } },
          updatedAt: new Date()
        }
      );

      return debateArguments;
    } catch (error) {
      console.error('Error generating initial arguments:', error);
      // Fallback to basic arguments
      return this.generateFallbackArguments(topic, codeContext);
    }
  }

  async addUserArgument(
    debateSessionId: string,
    userId: string,
    argumentData: DebateArgumentInput
  ): Promise<DebateArgumentData> {
    const argument: DebateArgumentData = {
      id: uuidv4(),
      content: argumentData.content,
      type: argumentData.type,
      confidence: argumentData.confidence,
      evidence: argumentData.evidence,
      source: 'user',
      timestamp: new Date()
    };

    await DebateSession.findOneAndUpdate(
      { id: debateSessionId },
      { 
        $push: { arguments: argument },
        updatedAt: new Date()
      }
    );

    return argument;
  }

  async generateCounterArgument(
    debateSessionId: string,
    targetArgumentId: string
  ): Promise<DebateArgumentData | null> {
    const debateSession = await this.getDebateSession(debateSessionId);
    if (!debateSession) {
      throw new Error('Debate session not found');
    }

    const targetArgument = debateSession.arguments.find(arg => arg.id === targetArgumentId);
    if (!targetArgument) {
      throw new Error('Target argument not found');
    }

    try {
      const counterArgument = await this.generateCounterArgumentForTarget(
        targetArgument as DebateArgumentData,
        debateSession.context.codeContext,
        debateSession.topic
      );

      const newArgument: DebateArgumentData = {
        id: uuidv4(),
        content: counterArgument.content,
        type: counterArgument.type,
        confidence: counterArgument.confidence,
        evidence: counterArgument.evidence,
        source: 'ai',
        timestamp: new Date()
      };

      await DebateSession.findOneAndUpdate(
        { id: debateSessionId },
        { 
          $push: { arguments: newArgument },
          updatedAt: new Date()
        }
      );

      return newArgument;
    } catch (error) {
      console.error('Error generating counter argument:', error);
      return null;
    }
  }

  async concludeDebate(
    debateSessionId: string,
    conclusion: {
      summary: string;
      recommendation: string;
      confidence: number;
    }
  ): Promise<IDebateSession | null> {
    return await DebateSession.findOneAndUpdate(
      { id: debateSessionId },
      {
        status: 'concluded',
        conclusion: {
          ...conclusion,
          timestamp: new Date()
        },
        updatedAt: new Date()
      },
      { new: true }
    ).lean();
  }

  async abandonDebate(debateSessionId: string): Promise<IDebateSession | null> {
    return await DebateSession.findOneAndUpdate(
      { id: debateSessionId },
      {
        status: 'abandoned',
        updatedAt: new Date()
      },
      { new: true }
    ).lean();
  }

  private async generateArgumentsForPosition(
    topic: string,
    codeContext: string,
    position: 'pro' | 'con'
  ): Promise<Array<{ content: string; confidence: number; evidence: string[] }>> {
    const prompt = `Analyze the following code and generate ${position} arguments for the topic: "${topic}"

Code Context:
${codeContext}

Generate 2-3 strong ${position} arguments. Each argument should include:
1. A clear, concise statement
2. Evidence or reasoning
3. Confidence level (0-1)

Format as JSON array with: content, confidence, evidence (array of strings)`;

    try {
      const response = await this.aiAnalysisService.analyzeCodeWithAI(prompt, codeContext);
      const parsedArguments = JSON.parse(response);
      return Array.isArray(parsedArguments) ? parsedArguments : [];
    } catch (error) {
      console.error('Error generating arguments:', error);
      return [];
    }
  }

  private async generateCounterArgumentForTarget(
    targetArgument: DebateArgumentData,
    codeContext: string,
    topic: string
  ): Promise<{ content: string; type: 'pro' | 'con' | 'neutral'; confidence: number; evidence: string[] }> {
    const prompt = `Generate a counter-argument to the following ${targetArgument.type} argument:

Target Argument: ${targetArgument.content}
Evidence: ${targetArgument.evidence.join(', ')}

Code Context:
${codeContext}

Topic: ${topic}

Generate a strong counter-argument that challenges the target argument. Consider:
1. Alternative interpretations
2. Potential flaws in reasoning
3. Different perspectives
4. Code-specific concerns

Format as JSON with: content, type (opposite of target), confidence, evidence (array)`;

    try {
      const response = await this.aiAnalysisService.analyzeCodeWithAI(prompt, codeContext);
      const counterArg = JSON.parse(response);
      return {
        content: counterArg.content || 'No counter-argument generated',
        type: targetArgument.type === 'pro' ? 'con' : 'pro',
        confidence: counterArg.confidence || 0.5,
        evidence: Array.isArray(counterArg.evidence) ? counterArg.evidence : []
      };
    } catch (error) {
      console.error('Error generating counter argument:', error);
      return {
        content: 'Unable to generate counter-argument',
        type: targetArgument.type === 'pro' ? 'con' : 'pro',
        confidence: 0.3,
        evidence: []
      };
    }
  }

  private generateFallbackArguments(
    topic: string,
    codeContext: string
  ): DebateArgumentData[] {
    return [
      {
        id: uuidv4(),
        content: `This approach aligns with the topic: ${topic}. The code structure supports this implementation.`,
        type: 'pro',
        confidence: 0.6,
        evidence: ['Code structure analysis', 'Topic alignment'],
        source: 'ai',
        timestamp: new Date()
      },
      {
        id: uuidv4(),
        content: `There might be alternative approaches that could be more effective for: ${topic}.`,
        type: 'con',
        confidence: 0.5,
        evidence: ['Alternative approaches exist', 'Potential improvements'],
        source: 'ai',
        timestamp: new Date()
      }
    ];
  }

  async getDebateAnalytics(sessionId: string): Promise<{
    totalDebates: number;
    activeDebates: number;
    concludedDebates: number;
    averageArgumentsPerDebate: number;
    mostActiveParticipants: Array<{ userId: string; argumentCount: number }>;
  }> {
    const debates = await DebateSession.find({ sessionId });
    
    const totalDebates = debates.length;
    const activeDebates = debates.filter((d: any) => d.status === 'active').length;
    const concludedDebates = debates.filter((d: any) => d.status === 'concluded').length;
    
    const totalArguments = debates.reduce((sum: number, debate: any) => sum + debate.arguments.length, 0);
    const averageArgumentsPerDebate = totalDebates > 0 ? totalArguments / totalDebates : 0;

    // Count arguments by participant
    const participantCounts = new Map<string, number>();
    debates.forEach((debate: any) => {
      debate.arguments.forEach((arg: any) => {
        if (arg.source === 'user') {
          const count = participantCounts.get('user') || 0;
          participantCounts.set('user', count + 1);
        }
      });
    });

    const mostActiveParticipants = Array.from(participantCounts.entries())
      .map(([userId, argumentCount]) => ({ userId, argumentCount }))
      .sort((a, b) => b.argumentCount - a.argumentCount)
      .slice(0, 5);

    return {
      totalDebates,
      activeDebates,
      concludedDebates,
      averageArgumentsPerDebate,
      mostActiveParticipants
    };
  }
}
