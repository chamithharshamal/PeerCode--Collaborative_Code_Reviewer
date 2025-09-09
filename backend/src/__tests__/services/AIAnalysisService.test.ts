import { AIAnalysisService } from '../../services/AIAnalysisService';
import { huggingFaceClient } from '../../config/huggingface';
import { CodeSnippet, AnalysisResult, AISuggestion, CodeChange } from '../../types';

// Mock the Hugging Face client
jest.mock('../../config/huggingface', () => ({
  huggingFaceClient: {
    getClient: jest.fn(),
    isConfigured: jest.fn(),
    getApiKey: jest.fn()
  }
}));

// Mock the HfInference client
const mockHfClient = {
  textGeneration: jest.fn()
};

describe('AIAnalysisService', () => {
  let aiAnalysisService: AIAnalysisService;
  let mockCodeSnippet: CodeSnippet;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    (huggingFaceClient.getClient as jest.Mock).mockReturnValue(mockHfClient);
    (huggingFaceClient.isConfigured as jest.Mock).mockReturnValue(true);
    (huggingFaceClient.getApiKey as jest.Mock).mockReturnValue('test-api-key');

    aiAnalysisService = new AIAnalysisService();

    mockCodeSnippet = {
      id: 'test-snippet-1',
      content: `function calculateSum(a, b) {
  console.log('Calculating sum');
  return a + b;
}`,
      language: 'javascript',
      filename: 'test.js',
      size: 100,
      uploadedAt: new Date()
    };
  });

  describe('analyzeCode', () => {
    it('should analyze code and return analysis result when AI is configured', async () => {
      // Mock AI responses
      mockHfClient.textGeneration
        .mockResolvedValueOnce({ generated_text: 'Bug: Potential null pointer exception on line 2' })
        .mockResolvedValueOnce({ generated_text: 'Security: No security issues found' })
        .mockResolvedValueOnce({ generated_text: 'Performance: Consider removing console.log for production' });

      const result = await aiAnalysisService.analyzeCode(mockCodeSnippet);

      expect(result).toBeDefined();
      expect(result.codeSnippetId).toBe(mockCodeSnippet.id);
      expect(result.language).toBe(mockCodeSnippet.language);
      expect(result.issues).toBeInstanceOf(Array);
      expect(result.metrics).toBeDefined();
      expect(result.suggestions).toBeInstanceOf(Array);
    });

    it('should return fallback analysis when AI is not configured', async () => {
      (huggingFaceClient.isConfigured as jest.Mock).mockReturnValue(false);

      const result = await aiAnalysisService.analyzeCode(mockCodeSnippet);

      expect(result).toBeDefined();
      expect(result.codeSnippetId).toBe(mockCodeSnippet.id);
      expect(result.suggestions).toContain('AI analysis is currently unavailable. Manual review recommended.');
    });

    it('should handle AI service failures gracefully', async () => {
      mockHfClient.textGeneration.mockRejectedValue(new Error('AI service unavailable'));

      const result = await aiAnalysisService.analyzeCode(mockCodeSnippet);

      expect(result).toBeDefined();
      expect(result.codeSnippetId).toBe(mockCodeSnippet.id);
      // Should return fallback analysis
      expect(result.suggestions).toContain('AI analysis is currently unavailable. Manual review recommended.');
    });

    it('should detect basic code issues in fallback mode', async () => {
      (huggingFaceClient.isConfigured as jest.Mock).mockReturnValue(false);

      const codeWithIssues: CodeSnippet = {
        ...mockCodeSnippet,
        content: `function test() {
  console.log('debug message');
  // TODO: implement this function
  return null;
}`
      };

      const result = await aiAnalysisService.analyzeCode(codeWithIssues);

      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some(issue => issue.message.includes('console.log'))).toBe(true);
      expect(result.issues.some(issue => issue.message.includes('TODO'))).toBe(true);
    });
  });

  describe('generateSuggestions', () => {
    it('should generate AI suggestions from analysis result', async () => {
      const mockAnalysis: AnalysisResult = {
        codeSnippetId: 'test-snippet-1',
        language: 'javascript',
        issues: [
          {
            type: 'bug',
            severity: 'high',
            line: 2,
            column: 1,
            message: 'Potential null pointer exception',
            suggestedFix: 'Add null checks'
          },
          {
            type: 'style',
            severity: 'low',
            line: 1,
            column: 1,
            message: 'Consider using arrow function'
          }
        ],
        metrics: {
          complexity: 60,
          maintainability: 70,
          readability: 80
        },
        suggestions: ['Use modern JavaScript features', 'Add error handling']
      };

      const suggestions = await aiAnalysisService.generateSuggestions(mockAnalysis);

      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toHaveProperty('id');
      expect(suggestions[0]).toHaveProperty('type');
      expect(suggestions[0]).toHaveProperty('severity');
      expect(suggestions[0]).toHaveProperty('title');
      expect(suggestions[0]).toHaveProperty('description');
      expect(suggestions[0]).toHaveProperty('confidence');
    });

    it('should categorize and prioritize suggestions correctly', async () => {
      const mockAnalysis: AnalysisResult = {
        codeSnippetId: 'test-snippet-1',
        language: 'javascript',
        issues: [
          {
            type: 'bug',
            severity: 'high',
            line: 1,
            column: 1,
            message: 'High severity bug'
          },
          {
            type: 'style',
            severity: 'low',
            line: 2,
            column: 1,
            message: 'Low severity style issue'
          },
          {
            type: 'optimization',
            severity: 'medium',
            line: 3,
            column: 1,
            message: 'Medium severity optimization'
          }
        ],
        metrics: {
          complexity: 80,
          maintainability: 80,
          readability: 80
        },
        suggestions: []
      };

      const suggestions = await aiAnalysisService.generateSuggestions(mockAnalysis);

      // Should be sorted by severity and confidence
      expect(suggestions[0].severity).toBe('high');
      expect(suggestions[0].type).toBe('bug');
    });

    it('should handle errors gracefully and return fallback suggestions', async () => {
      const mockAnalysis: AnalysisResult = {
        codeSnippetId: 'test-snippet-1',
        language: 'javascript',
        issues: [],
        metrics: {
          complexity: 50,
          maintainability: 50,
          readability: 50
        },
        suggestions: []
      };

      // Force an error by making the service throw
      jest.spyOn(aiAnalysisService as any, 'generateGeneralSuggestions').mockRejectedValue(new Error('Test error'));

      const suggestions = await aiAnalysisService.generateSuggestions(mockAnalysis);

      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBe(1);
      expect(suggestions[0].title).toBe('AI Analysis Unavailable');
    });
  });

  describe('simulateDebate', () => {
    let mockCodeChange: CodeChange;

    beforeEach(() => {
      mockCodeChange = {
        id: 'change-1',
        lineStart: 1,
        lineEnd: 3,
        originalCode: 'function oldFunction() { return null; }',
        proposedCode: 'const newFunction = () => null;',
        reason: 'Modernize to arrow function'
      };
    });

    it('should generate debate arguments when AI is configured', async () => {
      mockHfClient.textGeneration
        .mockResolvedValueOnce({ 
          generated_text: '1. Arrow functions are more concise\n2. Better lexical scoping\n3. Modern JavaScript standard' 
        })
        .mockResolvedValueOnce({ 
          generated_text: '1. Function declarations are hoisted\n2. More familiar to team\n3. Better debugging support' 
        });

      const result = await aiAnalysisService.simulateDebate(mockCodeChange);

      expect(result).toBeDefined();
      expect(result.arguments).toBeInstanceOf(Array);
      expect(result.counterArguments).toBeInstanceOf(Array);
      expect(result.context).toBeDefined();
      expect(result.context.codeChange).toBe(mockCodeChange);
    });

    it('should return fallback debate when AI is not configured', async () => {
      (huggingFaceClient.isConfigured as jest.Mock).mockReturnValue(false);

      const result = await aiAnalysisService.simulateDebate(mockCodeChange);

      expect(result).toBeDefined();
      expect(result.arguments).toContain('The proposed change improves code readability.');
      expect(result.counterArguments).toContain('The original code is more familiar to the team.');
    });

    it('should handle AI failures gracefully', async () => {
      mockHfClient.textGeneration.mockRejectedValue(new Error('AI service error'));

      const result = await aiAnalysisService.simulateDebate(mockCodeChange);

      expect(result).toBeDefined();
      expect(result.arguments).toBeInstanceOf(Array);
      expect(result.counterArguments).toBeInstanceOf(Array);
    });
  });

  describe('continueDebate', () => {
    let mockContext: any;

    beforeEach(() => {
      mockContext = {
        codeChange: {
          id: 'change-1',
          lineStart: 1,
          lineEnd: 3,
          originalCode: 'function oldFunction() { return null; }',
          proposedCode: 'const newFunction = () => null;',
          reason: 'Modernize to arrow function'
        },
        previousArguments: ['Arrow functions are more modern'],
        userResponses: ['I agree with modernization']
      };
    });

    it('should continue debate with AI response when configured', async () => {
      mockHfClient.textGeneration
        .mockResolvedValueOnce({ 
          generated_text: 'That\'s a valid point about modernization. However, consider the team\'s familiarity with the current syntax.' 
        })
        .mockResolvedValueOnce({ 
          generated_text: 'What about the performance implications?\nHave you considered backward compatibility?' 
        });

      const result = await aiAnalysisService.continueDebate(mockContext, 'I think arrow functions are better');

      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.followUpQuestions).toBeInstanceOf(Array);
      expect(result.context).toBeDefined();
      expect(result.context.userResponses).toContain('I think arrow functions are better');
    });

    it('should return fallback response when AI is not configured', async () => {
      (huggingFaceClient.isConfigured as jest.Mock).mockReturnValue(false);

      const result = await aiAnalysisService.continueDebate(mockContext, 'User input');

      expect(result).toBeDefined();
      expect(result.response).toContain('AI debate simulation is currently unavailable');
      expect(result.followUpQuestions).toContain('What are your main concerns about this code change?');
    });

    it('should handle AI failures gracefully', async () => {
      mockHfClient.textGeneration.mockRejectedValue(new Error('AI service error'));

      const result = await aiAnalysisService.continueDebate(mockContext, 'User input');

      expect(result).toBeDefined();
      expect(result.response).toContain('AI debate simulation is currently unavailable');
    });
  });

  describe('private helper methods', () => {
    it('should calculate code metrics correctly', () => {
      const issues = [
        { type: 'bug' as const, severity: 'high' as const, line: 1, column: 1, message: 'Bug 1' },
        { type: 'bug' as const, severity: 'high' as const, line: 2, column: 1, message: 'Bug 2' },
        { type: 'style' as const, severity: 'low' as const, line: 3, column: 1, message: 'Style 1' }
      ];

      const metrics = (aiAnalysisService as any).calculateCodeMetrics(mockCodeSnippet, issues);

      expect(metrics).toBeDefined();
      expect(metrics.complexity).toBeLessThan(100);
      expect(metrics.maintainability).toBeLessThan(100);
      expect(metrics.readability).toBeLessThan(100);
    });

    it('should prioritize issues correctly', () => {
      const issues = [
        { type: 'style' as const, severity: 'low' as const, line: 1, column: 1, message: 'Style issue' },
        { type: 'bug' as const, severity: 'high' as const, line: 2, column: 1, message: 'Critical bug' },
        { type: 'optimization' as const, severity: 'medium' as const, line: 3, column: 1, message: 'Performance issue' }
      ];

      const prioritized = (aiAnalysisService as any).prioritizeIssues(issues);

      expect(prioritized[0].severity).toBe('high');
      expect(prioritized[0].type).toBe('bug');
    });

    it('should generate appropriate suggestion titles', () => {
      const issue = {
        type: 'bug' as const,
        severity: 'high' as const,
        line: 5,
        column: 1,
        message: 'Test issue'
      };

      const title = (aiAnalysisService as any).generateSuggestionTitle(issue);

      expect(title).toBe('Potential Bug on line 5');
    });

    it('should calculate confidence scores correctly', () => {
      const highSeverityBug = {
        type: 'bug' as const,
        severity: 'high' as const,
        line: 1,
        column: 1,
        message: 'Critical bug'
      };

      const metrics = {
        complexity: 80,
        maintainability: 70,
        readability: 60
      };

      const confidence = (aiAnalysisService as any).calculateConfidence(highSeverityBug, metrics);

      expect(confidence).toBeGreaterThan(0.7); // High severity bug should have high confidence
      expect(confidence).toBeLessThanOrEqual(1.0);
    });
  });
});