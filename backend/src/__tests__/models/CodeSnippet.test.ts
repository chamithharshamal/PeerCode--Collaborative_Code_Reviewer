import { CodeSnippetModel } from '../../models/CodeSnippet';

describe('CodeSnippetModel', () => {
  describe('constructor', () => {
    it('should create a code snippet with required fields', () => {
      const content = 'console.log("Hello, world!");';
      const language = 'javascript';
      const filename = 'hello.js';

      const snippet = new CodeSnippetModel(content, language, filename);

      expect(snippet.id).toBeDefined();
      expect(snippet.content).toBe(content);
      expect(snippet.language).toBe(language);
      expect(snippet.filename).toBe(filename);
      expect(snippet.size).toBe(Buffer.byteLength(content, 'utf8'));
      expect(snippet.uploadedAt).toBeInstanceOf(Date);
    });

    it('should create a code snippet without filename', () => {
      const content = 'print("Hello, world!")';
      const language = 'python';

      const snippet = new CodeSnippetModel(content, language);

      expect(snippet.id).toBeDefined();
      expect(snippet.content).toBe(content);
      expect(snippet.language).toBe(language);
      expect(snippet.filename).toBeUndefined();
      expect(snippet.size).toBe(Buffer.byteLength(content, 'utf8'));
      expect(snippet.uploadedAt).toBeInstanceOf(Date);
    });

    it('should generate unique IDs for different instances', () => {
      const snippet1 = new CodeSnippetModel('code1', 'javascript');
      const snippet2 = new CodeSnippetModel('code2', 'python');

      expect(snippet1.id).not.toBe(snippet2.id);
    });

    it('should calculate correct size for UTF-8 content', () => {
      const content = 'Hello 世界'; // Contains Unicode characters
      const snippet = new CodeSnippetModel(content, 'plaintext');

      expect(snippet.size).toBe(Buffer.byteLength(content, 'utf8'));
      expect(snippet.size).toBeGreaterThan(content.length); // Unicode chars take more bytes
    });

    it('should set uploadedAt to current time', () => {
      const beforeCreation = new Date();
      const snippet = new CodeSnippetModel('test', 'plaintext');
      const afterCreation = new Date();

      expect(snippet.uploadedAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(snippet.uploadedAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });
  });

  describe('fromObject', () => {
    it('should create a CodeSnippetModel from a plain object', () => {
      const obj = {
        id: 'test-id',
        content: 'test content',
        language: 'javascript',
        filename: 'test.js',
        size: 12,
        uploadedAt: new Date('2023-01-01'),
      };

      const snippet = CodeSnippetModel.fromObject(obj);

      expect(snippet).toBeInstanceOf(CodeSnippetModel);
      expect(snippet.id).toBe(obj.id);
      expect(snippet.content).toBe(obj.content);
      expect(snippet.language).toBe(obj.language);
      expect(snippet.filename).toBe(obj.filename);
      expect(snippet.size).toBe(obj.size);
      expect(snippet.uploadedAt).toBe(obj.uploadedAt);
    });

    it('should handle objects without filename', () => {
      const obj = {
        id: 'test-id',
        content: 'test content',
        language: 'python',
        size: 12,
        uploadedAt: new Date('2023-01-01'),
      };

      const snippet = CodeSnippetModel.fromObject(obj);

      expect(snippet.filename).toBeUndefined();
    });
  });

  describe('toJSON', () => {
    it('should return a plain object representation', () => {
      const content = 'function test() {}';
      const language = 'javascript';
      const filename = 'test.js';

      const snippet = new CodeSnippetModel(content, language, filename);
      const json = snippet.toJSON();

      expect(json).toEqual({
        id: snippet.id,
        content: snippet.content,
        language: snippet.language,
        filename: snippet.filename,
        size: snippet.size,
        uploadedAt: snippet.uploadedAt,
      });
    });

    it('should return serializable object', () => {
      const snippet = new CodeSnippetModel('test', 'plaintext', 'test.txt');
      const json = snippet.toJSON();

      // Should be able to stringify and parse without errors
      const serialized = JSON.stringify(json);
      const parsed = JSON.parse(serialized);

      expect(parsed.id).toBe(snippet.id);
      expect(parsed.content).toBe(snippet.content);
      expect(parsed.language).toBe(snippet.language);
      expect(parsed.filename).toBe(snippet.filename);
      expect(parsed.size).toBe(snippet.size);
      expect(new Date(parsed.uploadedAt)).toEqual(snippet.uploadedAt);
    });
  });

  describe('integration', () => {
    it('should maintain data integrity through fromObject and toJSON', () => {
      const originalData = {
        id: 'original-id',
        content: 'const x = 42;',
        language: 'javascript',
        filename: 'example.js',
        size: 13,
        uploadedAt: new Date('2023-06-15T10:30:00Z'),
      };

      const snippet = CodeSnippetModel.fromObject(originalData);
      const jsonData = snippet.toJSON();

      expect(jsonData).toEqual(originalData);
    });

    it('should handle round-trip serialization', () => {
      const snippet = new CodeSnippetModel(
        'print("Hello, world!")',
        'python',
        'hello.py'
      );

      const json = snippet.toJSON();
      const serialized = JSON.stringify(json);
      const parsed = JSON.parse(serialized);
      const restored = CodeSnippetModel.fromObject({
        ...parsed,
        uploadedAt: new Date(parsed.uploadedAt),
      });

      expect(restored.id).toBe(snippet.id);
      expect(restored.content).toBe(snippet.content);
      expect(restored.language).toBe(snippet.language);
      expect(restored.filename).toBe(snippet.filename);
      expect(restored.size).toBe(snippet.size);
      expect(restored.uploadedAt).toEqual(snippet.uploadedAt);
    });
  });
});