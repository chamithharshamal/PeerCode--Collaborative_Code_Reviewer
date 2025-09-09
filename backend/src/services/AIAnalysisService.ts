import { HfInference } from '@huggingface/inference';
import { huggingFaceClient } from '../config/huggingface';
import { 
  CodeSnippet, 
  AISuggestion, 
  AnalysisResult, 
  CodeIssue, 
  CodeMetrics,
  DebateArguments,
  DebateContext,
  DebateResponse,
  CodeChange
} from '../types';
import { v4 as uuidv4 } from 'uuid';

export class AIAnalysisService {
  private hf: HfInference;
  private readonly codeBertModel = 'microsoft/codebert-base';
  private readonly codeT5Model = 'Salesforce/codet5-base';

  constructor() {
    this.hf = huggingFaceClient.getClient();
  }

  /**
   * Analyzes code snippet using CodeBERT and generates comprehensive analysis
   */
  async analyzeCode(codeSnippet: CodeSnippet): Promise<AnalysisResult> {
    try {
      if (!huggingFaceClient.isConfigured()) {
        return this.getFallbackAnalysis(codeSnippet);
      }

      // Perform multiple analysis types in parallel
      const [
        codeQualityAnalysis,
        securityAnalysis,
        performanceAnalysis
      ] = await Promise.allSettled([
        this.analyzeCodeQuality(codeSnippet),
        this.analyzeCodeSecurity(codeSnippet),
        this.analyzeCodePerformance(codeSnippet)
      ]);

      const issues: CodeIssue[] = [];
      const suggestions: string[] = [];

      // Process code quality analysis
      if (codeQualityAnalysis.status === 'fulfilled') {
        issues.push(...codeQualityAnalysis.value.issues);
        suggestions.push(...codeQualityAnalysis.value.suggestions);
      }

      // Process security analysis
      if (securityAnalysis.status === 'fulfilled') {
        issues.push(...securityAnalysis.value.issues);
        suggestions.push(...securityAnalysis.value.suggestions);
      }

      // Process performance analysis
      if (performanceAnalysis.status === 'fulfilled') {
        issues.push(...performanceAnalysis.value.issues);
        suggestions.push(...performanceAnalysis.value.suggestions);
      }

      const metrics = this.calculateCodeMetrics(codeSnippet, issues);

      // If no suggestions were generated, add fallback suggestions
      if (suggestions.length === 0) {
        suggestions.push(
          'AI analysis is currently unavailable. Manual review recommended.',
          'Consider running local linting tools for basic code quality checks.'
        );
      }

      return {
        codeSnippetId: codeSnippet.id,
        language: codeSnippet.language,
        issues: this.prioritizeIssues(issues),
        metrics,
        suggestions: this.deduplicateSuggestions(suggestions)
      };

    } catch (error) {
      console.error('AI analysis failed:', error);
      return this.getFallbackAnalysis(codeSnippet);
    }
  }

  /**
   * Generates AI suggestions based on analysis results
   */
  async generateSuggestions(analysis: AnalysisResult): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];

    try {
      for (const issue of analysis.issues) {
        const suggestion: AISuggestion = {
          id: uuidv4(),
          sessionId: '', // Will be set by the calling service
          type: issue.type,
          severity: issue.severity,
          lineStart: issue.line,
          lineEnd: issue.line,
          title: this.generateSuggestionTitle(issue),
          description: issue.message,
          suggestedFix: issue.suggestedFix,
          confidence: this.calculateConfidence(issue, analysis.metrics),
          createdAt: new Date()
        };

        suggestions.push(suggestion);
      }

      // Add general improvement suggestions
      const generalSuggestions = await this.generateGeneralSuggestions(analysis);
      suggestions.push(...generalSuggestions);

      return this.categorizeSuggestions(suggestions);

    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      return this.getFallbackSuggestions(analysis);
    }
  }

  /**
   * Simulates AI debate for code changes
   */
  async simulateDebate(codeChange: CodeChange): Promise<DebateArguments> {
    try {
      if (!huggingFaceClient.isConfigured()) {
        return this.getFallbackDebateArguments(codeChange);
      }

      const prompt = this.buildDebatePrompt(codeChange);
      
      // Generate arguments for the change
      const argumentsPrompt = `${prompt}\n\nGenerate 3 strong arguments in favor of this code change:`;
      const argumentsResponse = await this.generateText(argumentsPrompt);
      
      // Generate counter-arguments
      const counterPrompt = `${prompt}\n\nGenerate 3 strong arguments against this code change:`;
      const counterResponse = await this.generateText(counterPrompt);

      return {
        arguments: this.parseDebatePoints(argumentsResponse),
        counterArguments: this.parseDebatePoints(counterResponse),
        context: {
          codeChange,
          previousArguments: [],
          userResponses: []
        }
      };

    } catch (error) {
      console.error('Failed to simulate debate:', error);
      return this.getFallbackDebateArguments(codeChange);
    }
  }

  /**
   * Continues AI debate based on user input
   */
  async continueDebate(context: DebateContext, userInput: string): Promise<DebateResponse> {
    try {
      if (!huggingFaceClient.isConfigured()) {
        return this.getFallbackDebateResponse(context, userInput);
      }

      const prompt = this.buildContinueDebatePrompt(context, userInput);
      const response = await this.generateText(prompt);

      const followUpPrompt = `Based on the discussion about the code change, generate 2 follow-up questions to continue the debate:`;
      const followUpResponse = await this.generateText(followUpPrompt);

      return {
        response: response.trim(),
        followUpQuestions: this.parseFollowUpQuestions(followUpResponse),
        context: {
          ...context,
          previousArguments: [...context.previousArguments, response],
          userResponses: [...context.userResponses, userInput]
        }
      };

    } catch (error) {
      console.error('Failed to continue debate:', error);
      return this.getFallbackDebateResponse(context, userInput);
    }
  }

  // Private helper methods

  private async analyzeCodeQuality(codeSnippet: CodeSnippet): Promise<{ issues: CodeIssue[], suggestions: string[] }> {
    const prompt = `Analyze this ${codeSnippet.language} code for quality issues:\n\n${codeSnippet.content}\n\nIdentify potential bugs, code smells, and style issues.`;
    
    try {
      const response = await this.generateText(prompt);
      return this.parseQualityAnalysis(response, codeSnippet);
    } catch (error) {
      console.error('Code quality analysis failed:', error);
      return { issues: [], suggestions: [] };
    }
  }

  private async analyzeCodeSecurity(codeSnippet: CodeSnippet): Promise<{ issues: CodeIssue[], suggestions: string[] }> {
    const prompt = `Analyze this ${codeSnippet.language} code for security vulnerabilities:\n\n${codeSnippet.content}\n\nIdentify potential security risks and vulnerabilities.`;
    
    try {
      const response = await this.generateText(prompt);
      return this.parseSecurityAnalysis(response, codeSnippet);
    } catch (error) {
      console.error('Security analysis failed:', error);
      return { issues: [], suggestions: [] };
    }
  }

  private async analyzeCodePerformance(codeSnippet: CodeSnippet): Promise<{ issues: CodeIssue[], suggestions: string[] }> {
    const prompt = `Analyze this ${codeSnippet.language} code for performance issues:\n\n${codeSnippet.content}\n\nIdentify potential performance bottlenecks and optimization opportunities.`;
    
    try {
      const response = await this.generateText(prompt);
      return this.parsePerformanceAnalysis(response, codeSnippet);
    } catch (error) {
      console.error('Performance analysis failed:', error);
      return { issues: [], suggestions: [] };
    }
  }

  private async generateText(prompt: string): Promise<string> {
    try {
      const response = await this.hf.textGeneration({
        model: this.codeT5Model,
        inputs: prompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7,
          top_p: 0.9,
          do_sample: true
        }
      });

      return response.generated_text || '';
    } catch (error) {
      console.error('Text generation failed:', error);
      throw error;
    }
  }

  private parseQualityAnalysis(response: string, codeSnippet: CodeSnippet): { issues: CodeIssue[], suggestions: string[] } {
    const issues: CodeIssue[] = [];
    const suggestions: string[] = [];

    // Simple parsing logic - in production, this would be more sophisticated
    const lines = response.split('\n');
    let currentLine = 1;

    for (const line of lines) {
      if (line.toLowerCase().includes('bug') || line.toLowerCase().includes('error')) {
        issues.push({
          type: 'bug',
          severity: 'high',
          line: currentLine,
          column: 1,
          message: line.trim(),
          suggestedFix: this.generateFix(line, codeSnippet.language)
        });
      } else if (line.toLowerCase().includes('optimization') || line.toLowerCase().includes('performance')) {
        issues.push({
          type: 'optimization',
          severity: 'medium',
          line: currentLine,
          column: 1,
          message: line.trim()
        });
      } else if (line.toLowerCase().includes('style') || line.toLowerCase().includes('format')) {
        issues.push({
          type: 'style',
          severity: 'low',
          line: currentLine,
          column: 1,
          message: line.trim()
        });
      }

      if (line.toLowerCase().includes('suggest') || line.toLowerCase().includes('recommend')) {
        suggestions.push(line.trim());
      }

      currentLine++;
    }

    return { issues, suggestions };
  }

  private parseSecurityAnalysis(response: string, codeSnippet: CodeSnippet): { issues: CodeIssue[], suggestions: string[] } {
    const issues: CodeIssue[] = [];
    const suggestions: string[] = [];

    const lines = response.split('\n');
    let currentLine = 1;

    for (const line of lines) {
      if (line.toLowerCase().includes('vulnerability') || line.toLowerCase().includes('security')) {
        issues.push({
          type: 'bug',
          severity: 'high',
          line: currentLine,
          column: 1,
          message: `Security: ${line.trim()}`,
          suggestedFix: this.generateSecurityFix(line, codeSnippet.language)
        });
      }

      if (line.toLowerCase().includes('suggest') || line.toLowerCase().includes('recommend')) {
        suggestions.push(`Security: ${line.trim()}`);
      }

      currentLine++;
    }

    return { issues, suggestions };
  }

  private parsePerformanceAnalysis(response: string, codeSnippet: CodeSnippet): { issues: CodeIssue[], suggestions: string[] } {
    const issues: CodeIssue[] = [];
    const suggestions: string[] = [];

    const lines = response.split('\n');
    let currentLine = 1;

    for (const line of lines) {
      if (line.toLowerCase().includes('bottleneck') || line.toLowerCase().includes('slow')) {
        issues.push({
          type: 'optimization',
          severity: 'medium',
          line: currentLine,
          column: 1,
          message: `Performance: ${line.trim()}`,
          suggestedFix: this.generatePerformanceFix(line, codeSnippet.language)
        });
      }

      if (line.toLowerCase().includes('optimize') || line.toLowerCase().includes('improve')) {
        suggestions.push(`Performance: ${line.trim()}`);
      }

      currentLine++;
    }

    return { issues, suggestions };
  }

  private calculateCodeMetrics(codeSnippet: CodeSnippet, issues: CodeIssue[]): CodeMetrics {
    const lines = codeSnippet.content.split('\n');
    const totalLines = lines.length;
    const bugCount = issues.filter(i => i.type === 'bug').length;
    const styleCount = issues.filter(i => i.type === 'style').length;

    // Simple metrics calculation
    const complexity = Math.max(0, Math.min(100, 100 - (bugCount * 10)));
    const maintainability = Math.max(0, Math.min(100, 100 - (styleCount * 5)));
    const readability = Math.max(0, Math.min(100, 100 - (totalLines > 100 ? 20 : 0) - (bugCount * 5)));

    return {
      complexity,
      maintainability,
      readability
    };
  }

  private prioritizeIssues(issues: CodeIssue[]): CodeIssue[] {
    return issues.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      const typeOrder = { bug: 3, optimization: 2, style: 1 };
      
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      
      return typeOrder[b.type] - typeOrder[a.type];
    });
  }

  private deduplicateSuggestions(suggestions: string[]): string[] {
    return [...new Set(suggestions)];
  }

  private generateSuggestionTitle(issue: CodeIssue): string {
    const typeMap = {
      bug: 'Potential Bug',
      optimization: 'Performance Optimization',
      style: 'Style Improvement'
    };
    
    return `${typeMap[issue.type]} on line ${issue.line}`;
  }

  private calculateConfidence(issue: CodeIssue, metrics: CodeMetrics): number {
    let confidence = 0.7; // Base confidence
    
    if (issue.severity === 'high') confidence += 0.2;
    if (issue.type === 'bug') confidence += 0.1;
    if (metrics.complexity < 50) confidence -= 0.1;
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private async generateGeneralSuggestions(analysis: AnalysisResult): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];

    // Add general suggestions based on metrics
    if (analysis.metrics.complexity < 70) {
      suggestions.push({
        id: uuidv4(),
        sessionId: '',
        type: 'optimization',
        severity: 'medium',
        lineStart: 1,
        lineEnd: 1,
        title: 'Code Complexity',
        description: 'Consider refactoring to reduce complexity and improve maintainability.',
        confidence: 0.6,
        createdAt: new Date()
      });
    }

    if (analysis.metrics.readability < 70) {
      suggestions.push({
        id: uuidv4(),
        sessionId: '',
        type: 'style',
        severity: 'low',
        lineStart: 1,
        lineEnd: 1,
        title: 'Code Readability',
        description: 'Consider adding comments and improving variable names for better readability.',
        confidence: 0.5,
        createdAt: new Date()
      });
    }

    return suggestions;
  }

  private categorizeSuggestions(suggestions: AISuggestion[]): AISuggestion[] {
    return suggestions.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      const confidenceDiff = b.confidence - a.confidence;
      
      if (Math.abs(confidenceDiff) > 0.1) return confidenceDiff > 0 ? 1 : -1;
      
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  private generateFix(issue: string, language: string): string | undefined {
    // Simple fix generation based on common patterns
    if (issue.toLowerCase().includes('null') || issue.toLowerCase().includes('undefined')) {
      return 'Add null/undefined checks before accessing properties';
    }
    
    if (issue.toLowerCase().includes('loop') && language === 'javascript') {
      return 'Consider using array methods like map, filter, or reduce';
    }
    
    return undefined;
  }

  private generateSecurityFix(issue: string, language: string): string | undefined {
    if (issue.toLowerCase().includes('injection')) {
      return 'Use parameterized queries or input sanitization';
    }
    
    if (issue.toLowerCase().includes('xss')) {
      return 'Escape user input before rendering';
    }
    
    return undefined;
  }

  private generatePerformanceFix(issue: string, language: string): string | undefined {
    if (issue.toLowerCase().includes('loop')) {
      return 'Consider optimizing loop logic or using more efficient algorithms';
    }
    
    if (issue.toLowerCase().includes('memory')) {
      return 'Review memory usage and consider object pooling or cleanup';
    }
    
    return undefined;
  }

  private buildDebatePrompt(codeChange: CodeChange): string {
    return `Code Change Analysis:
Original Code (lines ${codeChange.lineStart}-${codeChange.lineEnd}):
${codeChange.originalCode}

Proposed Code:
${codeChange.proposedCode}

Reason: ${codeChange.reason}`;
  }

  private buildContinueDebatePrompt(context: DebateContext, userInput: string): string {
    return `Continuing debate about code change:
${this.buildDebatePrompt(context.codeChange)}

Previous arguments: ${context.previousArguments.join(', ')}
User response: ${userInput}

Provide a thoughtful response that addresses the user's point and continues the technical discussion:`;
  }

  private parseDebatePoints(response: string): string[] {
    return response
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 10)
      .slice(0, 3);
  }

  private parseFollowUpQuestions(response: string): string[] {
    return response
      .split('\n')
      .filter(line => line.includes('?'))
      .map(line => line.trim())
      .slice(0, 2);
  }

  // Fallback methods for when AI service is unavailable

  private getFallbackAnalysis(codeSnippet: CodeSnippet): AnalysisResult {
    const basicIssues = this.getBasicCodeIssues(codeSnippet);
    return {
      codeSnippetId: codeSnippet.id,
      language: codeSnippet.language,
      issues: basicIssues,
      metrics: {
        complexity: 75,
        maintainability: 80,
        readability: 85
      },
      suggestions: [
        'AI analysis is currently unavailable. Manual review recommended.',
        'Consider running local linting tools for basic code quality checks.'
      ]
    };
  }

  private getFallbackSuggestions(analysis: AnalysisResult): AISuggestion[] {
    return [{
      id: uuidv4(),
      sessionId: '',
      type: 'optimization',
      severity: 'low',
      lineStart: 1,
      lineEnd: 1,
      title: 'AI Analysis Unavailable',
      description: 'AI-powered suggestions are currently unavailable. Please review the code manually.',
      confidence: 0.1,
      createdAt: new Date()
    }];
  }

  private getFallbackDebateArguments(codeChange: CodeChange): DebateArguments {
    return {
      arguments: [
        'The proposed change improves code readability.',
        'This modification follows established best practices.',
        'The change reduces potential for future bugs.'
      ],
      counterArguments: [
        'The original code is more familiar to the team.',
        'This change might introduce unexpected side effects.',
        'The performance impact needs to be considered.'
      ],
      context: {
        codeChange,
        previousArguments: [],
        userResponses: []
      }
    };
  }

  private getFallbackDebateResponse(context: DebateContext, userInput: string): DebateResponse {
    return {
      response: 'AI debate simulation is currently unavailable. Please continue with manual code review and discussion.',
      followUpQuestions: [
        'What are your main concerns about this code change?',
        'Have you considered alternative approaches?'
      ],
      context
    };
  }

  private getBasicCodeIssues(codeSnippet: CodeSnippet): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const lines = codeSnippet.content.split('\n');

    // Basic static analysis
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();
      
      // Check for common issues
      if (trimmedLine.includes('console.log') && codeSnippet.language === 'javascript') {
        issues.push({
          type: 'style',
          severity: 'low',
          line: lineNumber,
          column: line.indexOf('console.log') + 1,
          message: 'Remove console.log statements before production',
          suggestedFix: 'Use proper logging library instead'
        });
      }
      
      // Check for TODO/FIXME comments (including in comments)
      if (trimmedLine.includes('TODO') || trimmedLine.includes('FIXME') || 
          trimmedLine.includes('// TODO') || trimmedLine.includes('// FIXME')) {
        issues.push({
          type: 'optimization',
          severity: 'medium',
          line: lineNumber,
          column: 1,
          message: 'Unfinished implementation found',
          suggestedFix: 'Complete the implementation or remove the TODO comment'
        });
      }
    });

    return issues;
  }
}