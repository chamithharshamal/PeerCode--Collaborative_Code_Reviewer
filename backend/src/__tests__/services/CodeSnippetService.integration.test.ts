import { CodeSnippetService } from '../../services/CodeSnippetService';
import { pool } from '../../config/database';

describe('CodeSnippetService Integration Tests', () => {
  let codeSnippetService: CodeSnippetService;

  beforeAll(async () => {
    codeSnippetService = new CodeSnippetService();
  });

  beforeEach(async () => {
    // Clear all code snippets before each test
    await codeSnippetService.clearAllCodeSnippets();
  });

  afterAll(async () => {
    // Clean up after all tests
    await codeSnippetService.clearAllCodeSnippets();
    await pool.end();
  });

  describe('storeCodeSnippet', () => {
    it('should store a code snippet successfully', async () => {
      const content = 'function hello() { return "world"; }';
      const language = 'javascript';
      const filename = 'test.js';

      const result = await codeSnippetService.storeCodeSnippet(content, language, filename);

      expect(result).toMatchObject({
        content,
        language,
        filename,
        size: expect.any(Number),
        uploadedAt: expect.any(Date),
      });
      expect(result.id).toBeDefined();
      expect(result.size).toBe(Buffer.byteLength(content, 'utf8'));
    });

    it('should store a code snippet without filename', async () => {
      const content = 'print("Hello, World!")';
      const language = 'python';

      const result = await codeSnippetService.storeCodeSnippet(content, language);

      expect(result).toMatchObject({
        content,
        language,
        filename: undefined,
        size: expect.any(Number),
        uploadedAt: expect.any(Date),
      });
    });
  });

  describe('getCodeSnippet', () => {
    it('should retrieve a stored code snippet', async () => {
      const content = 'const x = 42;';
      const language = 'javascript';
      const filename = 'test.js';

      const stored = await codeSnippetService.storeCodeSnippet(content, language, filename);
      const retrieved = await codeSnippetService.getCodeSnippet(stored.id);

      expect(retrieved).toEqual(stored);
    });

    it('should return null for non-existent snippet', async () => {
      const result = await codeSnippetService.getCodeSnippet('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('deleteCodeSnippet', () => {
    it('should delete a code snippet successfully', async () => {
      const content = 'def hello(): return "world"';
      const language = 'python';
      const filename = 'test.py';

      const stored = await codeSnippetService.storeCodeSnippet(content, language, filename);
      const deleted = await codeSnippetService.deleteCodeSnippet(stored.id);

      expect(deleted).toBe(true);

      const retrieved = await codeSnippetService.getCodeSnippet(stored.id);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent snippet', async () => {
      const deleted = await codeSnippetService.deleteCodeSnippet('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('getAllCodeSnippets', () => {
    it('should return all code snippets in descending order by upload date', async () => {
      const snippets = [
        { content: 'first', language: 'javascript', filename: 'first.js' },
        { content: 'second', language: 'python', filename: 'second.py' },
        { content: 'third', language: 'java', filename: 'third.java' },
      ];

      const storedSnippets = [];
      for (const snippet of snippets) {
        const stored = await codeSnippetService.storeCodeSnippet(
          snippet.content,
          snippet.language,
          snippet.filename
        );
        storedSnippets.push(stored);
      }

      const allSnippets = await codeSnippetService.getAllCodeSnippets();

      expect(allSnippets).toHaveLength(3);
      // Should be ordered by uploadedAt descending (most recent first)
      expect(allSnippets[0].content).toBe('third');
      expect(allSnippets[1].content).toBe('second');
      expect(allSnippets[2].content).toBe('first');
    });

    it('should return empty array when no snippets exist', async () => {
      const allSnippets = await codeSnippetService.getAllCodeSnippets();
      expect(allSnippets).toEqual([]);
    });
  });

  describe('getCodeSnippetsByLanguage', () => {
    it('should return snippets filtered by language', async () => {
      const snippets = [
        { content: 'js1', language: 'javascript', filename: 'js1.js' },
        { content: 'py1', language: 'python', filename: 'py1.py' },
        { content: 'js2', language: 'javascript', filename: 'js2.js' },
      ];

      for (const snippet of snippets) {
        await codeSnippetService.storeCodeSnippet(
          snippet.content,
          snippet.language,
          snippet.filename
        );
      }

      const jsSnippets = await codeSnippetService.getCodeSnippetsByLanguage('javascript');
      const pySnippets = await codeSnippetService.getCodeSnippetsByLanguage('python');

      expect(jsSnippets).toHaveLength(2);
      expect(jsSnippets.every(s => s.language === 'javascript')).toBe(true);

      expect(pySnippets).toHaveLength(1);
      expect(pySnippets[0].language).toBe('python');
    });
  });

  describe('searchCodeSnippets', () => {
    it('should search snippets by content', async () => {
      const snippets = [
        { content: 'function hello() { return "world"; }', language: 'javascript', filename: 'hello.js' },
        { content: 'def goodbye(): return "world"', language: 'python', filename: 'goodbye.py' },
        { content: 'const x = 42;', language: 'javascript', filename: 'constants.js' },
      ];

      for (const snippet of snippets) {
        await codeSnippetService.storeCodeSnippet(
          snippet.content,
          snippet.language,
          snippet.filename
        );
      }

      const worldResults = await codeSnippetService.searchCodeSnippets('world');
      const helloResults = await codeSnippetService.searchCodeSnippets('hello');

      expect(worldResults).toHaveLength(2);
      expect(worldResults.every(s => s.content.includes('world'))).toBe(true);

      expect(helloResults).toHaveLength(1);
      expect(helloResults[0].content).toContain('hello');
    });

    it('should search snippets by filename', async () => {
      const snippets = [
        { content: 'content1', language: 'javascript', filename: 'test.js' },
        { content: 'content2', language: 'python', filename: 'test.py' },
        { content: 'content3', language: 'java', filename: 'other.java' },
      ];

      for (const snippet of snippets) {
        await codeSnippetService.storeCodeSnippet(
          snippet.content,
          snippet.language,
          snippet.filename
        );
      }

      const testResults = await codeSnippetService.searchCodeSnippets('test');
      expect(testResults).toHaveLength(2);
      expect(testResults.every(s => s.filename?.includes('test'))).toBe(true);
    });
  });

  describe('updateCodeSnippet', () => {
    it('should update code snippet content', async () => {
      const original = await codeSnippetService.storeCodeSnippet(
        'original content',
        'javascript',
        'test.js'
      );

      const updated = await codeSnippetService.updateCodeSnippet(original.id, {
        content: 'updated content',
      });

      expect(updated).toMatchObject({
        id: original.id,
        content: 'updated content',
        language: 'javascript',
        filename: 'test.js',
      });
      expect(updated?.size).toBe(Buffer.byteLength('updated content', 'utf8'));
    });

    it('should update code snippet language', async () => {
      const original = await codeSnippetService.storeCodeSnippet(
        'print("hello")',
        'python',
        'test.py'
      );

      const updated = await codeSnippetService.updateCodeSnippet(original.id, {
        language: 'javascript',
      });

      expect(updated?.language).toBe('javascript');
    });

    it('should update code snippet filename', async () => {
      const original = await codeSnippetService.storeCodeSnippet(
        'content',
        'javascript',
        'old.js'
      );

      const updated = await codeSnippetService.updateCodeSnippet(original.id, {
        filename: 'new.js',
      });

      expect(updated?.filename).toBe('new.js');
    });

    it('should return null for non-existent snippet', async () => {
      const result = await codeSnippetService.updateCodeSnippet('non-existent-id', {
        content: 'updated',
      });

      expect(result).toBeNull();
    });
  });

  describe('clearAllCodeSnippets', () => {
    it('should clear all code snippets', async () => {
      // Add some snippets
      await codeSnippetService.storeCodeSnippet('content1', 'javascript', 'test1.js');
      await codeSnippetService.storeCodeSnippet('content2', 'python', 'test2.py');

      let allSnippets = await codeSnippetService.getAllCodeSnippets();
      expect(allSnippets).toHaveLength(2);

      // Clear all
      await codeSnippetService.clearAllCodeSnippets();

      allSnippets = await codeSnippetService.getAllCodeSnippets();
      expect(allSnippets).toHaveLength(0);
    });
  });
});
