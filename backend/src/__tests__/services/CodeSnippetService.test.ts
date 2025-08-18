import { CodeSnippetService } from '../../services/CodeSnippetService';

describe('CodeSnippetService', () => {
  let service: CodeSnippetService;

  beforeEach(() => {
    service = new CodeSnippetService();
    // Clear any existing data before each test
    service.clearAllCodeSnippets();
  });

  afterEach(async () => {
    // Clean up after each test
    await service.clearAllCodeSnippets();
  });

  describe('storeCodeSnippet', () => {
    it('should store a code snippet and return it', async () => {
      const content = 'console.log("Hello, world!");';
      const language = 'javascript';
      const filename = 'hello.js';

      const result = await service.storeCodeSnippet(content, language, filename);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.content).toBe(content);
      expect(result.language).toBe(language);
      expect(result.filename).toBe(filename);
      expect(result.size).toBe(Buffer.byteLength(content, 'utf8'));
      expect(result.uploadedAt).toBeInstanceOf(Date);
    });

    it('should store a code snippet without filename', async () => {
      const content = 'print("Hello, world!")';
      const language = 'python';

      const result = await service.storeCodeSnippet(content, language);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.content).toBe(content);
      expect(result.language).toBe(language);
      expect(result.filename).toBeUndefined();
    });

    it('should generate unique IDs for different snippets', async () => {
      const snippet1 = await service.storeCodeSnippet('code1', 'javascript');
      const snippet2 = await service.storeCodeSnippet('code2', 'python');

      expect(snippet1.id).not.toBe(snippet2.id);
    });

    it('should store multiple snippets independently', async () => {
      const snippet1 = await service.storeCodeSnippet('function test1() {}', 'javascript', 'test1.js');
      const snippet2 = await service.storeCodeSnippet('def test2(): pass', 'python', 'test2.py');

      const retrieved1 = await service.getCodeSnippet(snippet1.id);
      const retrieved2 = await service.getCodeSnippet(snippet2.id);

      expect(retrieved1).toEqual(snippet1);
      expect(retrieved2).toEqual(snippet2);
    });
  });

  describe('getCodeSnippet', () => {
    it('should retrieve a stored code snippet by ID', async () => {
      const content = 'const x = 42;';
      const language = 'javascript';
      const filename = 'test.js';

      const stored = await service.storeCodeSnippet(content, language, filename);
      const retrieved = await service.getCodeSnippet(stored.id);

      expect(retrieved).toEqual(stored);
    });

    it('should return null for non-existent ID', async () => {
      const result = await service.getCodeSnippet('non-existent-id');
      expect(result).toBeNull();
    });

    it('should return null for empty string ID', async () => {
      const result = await service.getCodeSnippet('');
      expect(result).toBeNull();
    });

    it('should handle UUID-like IDs correctly', async () => {
      const snippet = await service.storeCodeSnippet('test', 'plaintext');
      
      // Verify the ID looks like a UUID
      expect(snippet.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      
      const retrieved = await service.getCodeSnippet(snippet.id);
      expect(retrieved).toEqual(snippet);
    });
  });

  describe('deleteCodeSnippet', () => {
    it('should delete an existing code snippet', async () => {
      const snippet = await service.storeCodeSnippet('test code', 'plaintext');
      
      const deleteResult = await service.deleteCodeSnippet(snippet.id);
      expect(deleteResult).toBe(true);

      const retrieved = await service.getCodeSnippet(snippet.id);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent ID', async () => {
      const result = await service.deleteCodeSnippet('non-existent-id');
      expect(result).toBe(false);
    });

    it('should not affect other snippets when deleting one', async () => {
      const snippet1 = await service.storeCodeSnippet('code1', 'javascript');
      const snippet2 = await service.storeCodeSnippet('code2', 'python');

      const deleteResult = await service.deleteCodeSnippet(snippet1.id);
      expect(deleteResult).toBe(true);

      const retrieved1 = await service.getCodeSnippet(snippet1.id);
      const retrieved2 = await service.getCodeSnippet(snippet2.id);

      expect(retrieved1).toBeNull();
      expect(retrieved2).toEqual(snippet2);
    });
  });

  describe('getAllCodeSnippets', () => {
    it('should return empty array when no snippets exist', async () => {
      const result = await service.getAllCodeSnippets();
      expect(result).toEqual([]);
    });

    it('should return all stored snippets', async () => {
      const snippet1 = await service.storeCodeSnippet('code1', 'javascript', 'file1.js');
      const snippet2 = await service.storeCodeSnippet('code2', 'python', 'file2.py');
      const snippet3 = await service.storeCodeSnippet('code3', 'java', 'file3.java');

      const result = await service.getAllCodeSnippets();

      expect(result).toHaveLength(3);
      expect(result).toContainEqual(snippet1);
      expect(result).toContainEqual(snippet2);
      expect(result).toContainEqual(snippet3);
    });

    it('should return updated list after deletions', async () => {
      const snippet1 = await service.storeCodeSnippet('code1', 'javascript');
      const snippet2 = await service.storeCodeSnippet('code2', 'python');

      let allSnippets = await service.getAllCodeSnippets();
      expect(allSnippets).toHaveLength(2);

      await service.deleteCodeSnippet(snippet1.id);

      allSnippets = await service.getAllCodeSnippets();
      expect(allSnippets).toHaveLength(1);
      expect(allSnippets[0]).toEqual(snippet2);
    });
  });

  describe('clearAllCodeSnippets', () => {
    it('should remove all stored snippets', async () => {
      await service.storeCodeSnippet('code1', 'javascript');
      await service.storeCodeSnippet('code2', 'python');
      await service.storeCodeSnippet('code3', 'java');

      let allSnippets = await service.getAllCodeSnippets();
      expect(allSnippets).toHaveLength(3);

      await service.clearAllCodeSnippets();

      allSnippets = await service.getAllCodeSnippets();
      expect(allSnippets).toHaveLength(0);
    });

    it('should not throw error when clearing empty storage', async () => {
      await expect(service.clearAllCodeSnippets()).resolves.not.toThrow();
      
      const allSnippets = await service.getAllCodeSnippets();
      expect(allSnippets).toHaveLength(0);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex workflow: store, retrieve, modify, delete', async () => {
      // Store initial snippet
      const originalSnippet = await service.storeCodeSnippet(
        'function original() {}',
        'javascript',
        'original.js'
      );

      // Retrieve and verify
      const retrieved = await service.getCodeSnippet(originalSnippet.id);
      expect(retrieved).toEqual(originalSnippet);

      // Store modified version (simulating update by storing new snippet)
      const modifiedSnippet = await service.storeCodeSnippet(
        'function modified() { return true; }',
        'javascript',
        'modified.js'
      );

      // Verify both exist
      const allSnippets = await service.getAllCodeSnippets();
      expect(allSnippets).toHaveLength(2);

      // Delete original
      const deleteResult = await service.deleteCodeSnippet(originalSnippet.id);
      expect(deleteResult).toBe(true);

      // Verify only modified remains
      const finalSnippets = await service.getAllCodeSnippets();
      expect(finalSnippets).toHaveLength(1);
      expect(finalSnippets[0]).toEqual(modifiedSnippet);
    });

    it('should handle large content correctly', async () => {
      const largeContent = 'console.log("line");\n'.repeat(1000);
      const snippet = await service.storeCodeSnippet(largeContent, 'javascript', 'large.js');

      expect(snippet.size).toBe(Buffer.byteLength(largeContent, 'utf8'));
      expect(snippet.content).toBe(largeContent);

      const retrieved = await service.getCodeSnippet(snippet.id);
      expect(retrieved?.content).toBe(largeContent);
    });

    it('should handle special characters and Unicode', async () => {
      const unicodeContent = '// 这是一个测试\nconst emoji = "🚀";\nconsole.log("Hello 世界");';
      const snippet = await service.storeCodeSnippet(unicodeContent, 'javascript', 'unicode.js');

      const retrieved = await service.getCodeSnippet(snippet.id);
      expect(retrieved?.content).toBe(unicodeContent);
      expect(retrieved?.size).toBe(Buffer.byteLength(unicodeContent, 'utf8'));
    });
  });
});