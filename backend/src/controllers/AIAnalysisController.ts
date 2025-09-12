import { Request, Response } from 'express';
import { AIAnalysisService } from '../services/AIAnalysisService';
import { CodeSnippetService } from '../services/CodeSnippetService';
import { SessionService } from '../services/SessionService';
import { ApiResponse, AnalyzeCodeRequest, AnalyzeCodeResponse } from '../types/api';
import { AISuggestion, CodeChange } from '../types';

export class AIAnalysisController {
  private aiAnalysisService: AIAnalysisService;
  private codeSnippetService: CodeSnippetService;
  private sessionService: SessionService;

  constructor() {
    this.aiAnalysisService = new AIAnalysisService();
    this.codeSnippetService = new CodeSnippetService();
    this.sessionService = new SessionService();
  }

  /**
   * Analyze code snippet and generate AI suggestions
   */
  analyzeCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { codeSnippetId } = req.body as AnalyzeCodeRequest;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required',
            code: 'UNAUTHORIZED'
          }
        } as ApiResponse);
        return;
      }

      if (!codeSnippetId) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Code snippet ID is required',
            code: 'MISSING_CODE_SNIPPET_ID'
          }
        } as ApiResponse);
        return;
      }

      // Get the code snippet
      const codeSnippet = await this.codeSnippetService.getCodeSnippet(codeSnippetId);
      if (!codeSnippet) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Code snippet not found',
            code: 'CODE_SNIPPET_NOT_FOUND'
          }
        } as ApiResponse);
        return;
      }

      // Perform AI analysis
      const analysis = await this.aiAnalysisService.analyzeCode(codeSnippet);
      const suggestions = await this.aiAnalysisService.generateSuggestions(analysis);

      // Generate unique analysis ID for tracking
      const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const response: AnalyzeCodeResponse = {
        suggestions,
        analysisId
      };

      res.json({
        success: true,
        data: response
      } as ApiResponse<AnalyzeCodeResponse>);

    } catch (error) {
      console.error('Error analyzing code:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to analyze code',
          code: 'ANALYSIS_FAILED',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      } as ApiResponse);
    }
  };

  /**
   * Analyze code for a specific session
   */
  analyzeSessionCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required',
            code: 'UNAUTHORIZED'
          }
        } as ApiResponse);
        return;
      }

      // Get the session
      const session = await this.sessionService.getById(sessionId);
      if (!session) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Session not found',
            code: 'SESSION_NOT_FOUND'
          }
        } as ApiResponse);
        return;
      }

      // Check if user has access to the session
      if (session.creatorId !== userId && !session.participants.some(p => p.userId === userId)) {
        res.status(403).json({
          success: false,
          error: {
            message: 'Access denied to session',
            code: 'ACCESS_DENIED'
          }
        } as ApiResponse);
        return;
      }

      // Get the code snippet for the session
      const codeSnippet = await this.codeSnippetService.getCodeSnippet(session.codeSnippetId);
      if (!codeSnippet) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Code snippet not found for session',
            code: 'CODE_SNIPPET_NOT_FOUND'
          }
        } as ApiResponse);
        return;
      }

      // Perform AI analysis on the session's code snippet
      const analysis = await this.aiAnalysisService.analyzeCode(codeSnippet);
      const suggestions = await this.aiAnalysisService.generateSuggestions(analysis);

      // Update suggestions with session ID
      const sessionSuggestions = suggestions.map(suggestion => ({
        ...suggestion,
        sessionId
      }));

      // Update the session with AI suggestions
      await this.sessionService.updateAISuggestions(sessionId, sessionSuggestions);

      const analysisId = `session_analysis_${sessionId}_${Date.now()}`;

      const response: AnalyzeCodeResponse = {
        suggestions: sessionSuggestions,
        analysisId
      };

      res.json({
        success: true,
        data: response
      } as ApiResponse<AnalyzeCodeResponse>);

    } catch (error) {
      console.error('Error analyzing session code:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to analyze session code',
          code: 'SESSION_ANALYSIS_FAILED',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      } as ApiResponse);
    }
  };

  /**
   * Start AI debate simulation for a code change
   */
  startDebate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { codeChange } = req.body as { codeChange: CodeChange };
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required',
            code: 'UNAUTHORIZED'
          }
        } as ApiResponse);
        return;
      }

      if (!codeChange) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Code change is required',
            code: 'MISSING_CODE_CHANGE'
          }
        } as ApiResponse);
        return;
      }

      // Get the session
      const session = await this.sessionService.getById(sessionId);
      if (!session) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Session not found',
            code: 'SESSION_NOT_FOUND'
          }
        } as ApiResponse);
        return;
      }

      // Check if user has access to the session
      if (session.creatorId !== userId && !session.participants.some(p => p.userId === userId)) {
        res.status(403).json({
          success: false,
          error: {
            message: 'Access denied to session',
            code: 'ACCESS_DENIED'
          }
        } as ApiResponse);
        return;
      }

      // Generate debate arguments
      const debateArguments = await this.aiAnalysisService.simulateDebate(codeChange);

      res.json({
        success: true,
        data: debateArguments
      } as ApiResponse);

    } catch (error) {
      console.error('Error starting debate:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to start debate',
          code: 'DEBATE_START_FAILED',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      } as ApiResponse);
    }
  };

  /**
   * Continue AI debate with user response
   */
  continueDebate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { context, userInput } = req.body as { context: any, userInput: string };
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required',
            code: 'UNAUTHORIZED'
          }
        } as ApiResponse);
        return;
      }

      if (!context || !userInput) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Context and user input are required',
            code: 'MISSING_DEBATE_DATA'
          }
        } as ApiResponse);
        return;
      }

      // Get the session
      const session = await this.sessionService.getById(sessionId);
      if (!session) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Session not found',
            code: 'SESSION_NOT_FOUND'
          }
        } as ApiResponse);
        return;
      }

      // Check if user has access to the session
      if (session.creatorId !== userId && !session.participants.some(p => p.userId === userId)) {
        res.status(403).json({
          success: false,
          error: {
            message: 'Access denied to session',
            code: 'ACCESS_DENIED'
          }
        } as ApiResponse);
        return;
      }

      // Continue the debate
      const debateResponse = await this.aiAnalysisService.continueDebate(context, userInput);

      res.json({
        success: true,
        data: debateResponse
      } as ApiResponse);

    } catch (error) {
      console.error('Error continuing debate:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to continue debate',
          code: 'DEBATE_CONTINUE_FAILED',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      } as ApiResponse);
    }
  };

  /**
   * Enhanced code analysis with categorization and prioritization
   */
  analyzeCodeEnhanced = async (req: Request, res: Response): Promise<void> => {
    try {
      const { codeSnippetId, config } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required',
            code: 'UNAUTHORIZED'
          }
        } as ApiResponse);
        return;
      }

      if (!codeSnippetId) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Code snippet ID is required',
            code: 'MISSING_CODE_SNIPPET_ID'
          }
        } as ApiResponse);
        return;
      }

      // Get the code snippet
      const codeSnippet = await this.codeSnippetService.getCodeSnippet(codeSnippetId);
      if (!codeSnippet) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Code snippet not found',
            code: 'CODE_SNIPPET_NOT_FOUND'
          }
        } as ApiResponse);
        return;
      }

      // Create enhanced AI analysis service with custom config
      const enhancedService = new AIAnalysisService(config);
      
      // Perform enhanced analysis
      const analysis = await enhancedService.analyzeCodeEnhanced(codeSnippet);
      
      // Generate prioritized suggestions
      const suggestions = await enhancedService.generateSuggestions(analysis);

      const response = {
        analysis,
        suggestions,
        metadata: {
          processingTime: analysis.processingTime,
          confidence: analysis.confidence,
          categories: Object.keys(analysis.categories).map(categoryId => {
            const category = enhancedService['suggestionCategories'].find(c => c.id === categoryId);
            return {
              id: categoryId,
              name: category?.name || categoryId,
              count: analysis.categories[categoryId as keyof typeof analysis.categories].length,
              priority: category?.priority || 'medium'
            };
          })
        }
      };

      res.json({
        success: true,
        data: response
      } as ApiResponse);

    } catch (error) {
      console.error('Error in enhanced code analysis:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to perform enhanced code analysis',
          code: 'ENHANCED_ANALYSIS_FAILED',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      } as ApiResponse);
    }
  };

  /**
   * Get AI analysis health status
   */
  getHealthStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const isConfigured = process.env.HUGGINGFACE_API_KEY ? true : false;
      
      res.json({
        success: true,
        data: {
          aiServiceAvailable: isConfigured,
          models: {
            codebert: 'microsoft/codebert-base',
            codet5: 'Salesforce/codet5-base'
          },
          features: {
            codeAnalysis: true,
            suggestionGeneration: true,
            debateSimulation: isConfigured,
            fallbackMode: !isConfigured
          }
        }
      } as ApiResponse);

    } catch (error) {
      console.error('Error getting AI health status:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get AI health status',
          code: 'HEALTH_CHECK_FAILED'
        }
      } as ApiResponse);
    }
  };
}