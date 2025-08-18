import request from 'supertest';
import express from 'express';
import { CodeSnippetService } from '../../services/CodeSnippetService';
import codeSnippetRoutes from '../../routes/codeSnippet';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/code-snippets', codeSnippetRoutes);

// Mock the service to avoid interference between tests
jest.mock('../../services/CodeSnippetService');

describe('CodeSnippetController', () => {
  let mockService: jest.Mocked<CodeSnippetService>;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Get the mocked service instance
    mockService = require('../../services/CodeSnippetService').codeSnippetService;
  });

  describe('POST /upload', () => {
    it('should upload a valid code file successfully', async () => {
      const mockCodeSnippet = {
        id: 'test-id',
        content: 'console.log("Hello");',
        language: 'javascript',
        filename: 'test.js',
        size: 21,
        uploadedAt: new Date(),
      };

      mockService.storeCodeSnippet.mockResolvedValue(mockCodeSnippet);

      const response = await request(app)
        .post('/api/code-snippets/upload')
        .attach('file', Buffer.from('console.log("Hello");'), 'test.js')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(expect.objectContaining({
        id: mockCodeSnippet.id,
        content: mockCodeSnippet.content,
        language: mockCodeSnippet.language,
        filename: mockCodeSnippet.filename,
      }));

      expect(mockService.storeCodeSnippet).toHaveBeenCalledWith(
        'console.log("Hello");',
        'javascript',
        'test.js'
      );
    });

    it('should return 400 when no file is uploaded', async () => {
      const response = await request(app)
        .post('/api/code-snippets/upload')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No file uploaded');
    });

    it('should return 400 for invalid file content', async () => {
      const response = await request(app)
        .post('/api/code-snippets/upload')
        .attach('file', Buffer.from(''), 'empty.js') // Empty file
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('File validation failed');
      expect(response.body.details).toContain('File content cannot be empty');
    });

    it('should return 400 for unsupported file extension', async () => {
      const response = await request(app)
        .post('/api/code-snippets/upload')
        .attach('file', Buffer.from('test content'), 'test.exe')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('File validation failed');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.stringContaining('not supported')
        ])
      );
    });

    it('should detect language from filename', async () => {
      const mockCodeSnippet = {
        id: 'test-id',
        content: 'def hello(): pass',
        language: 'python',
        filename: 'test.py',
        size: 17,
        uploadedAt: new Date(),
      };

      mockService.storeCodeSnippet.mockResolvedValue(mockCodeSnippet);

      await request(app)
        .post('/api/code-snippets/upload')
        .attach('file', Buffer.from('def hello(): pass'), 'test.py')
        .expect(201);

      expect(mockService.storeCodeSnippet).toHaveBeenCalledWith(
        'def hello(): pass',
        'python',
        'test.py'
      );
    });

    it('should handle service errors gracefully', async () => {
      mockService.storeCodeSnippet.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/code-snippets/upload')
        .attach('file', Buffer.from('console.log("test");'), 'test.js')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('POST /upload-text', () => {
    it('should upload text content successfully', async () => {
      const mockCodeSnippet = {
        id: 'test-id',
        content: 'print("Hello")',
        language: 'python',
        filename: 'snippet.py',
        size: 15,
        uploadedAt: new Date(),
      };

      mockService.storeCodeSnippet.mockResolvedValue(mockCodeSnippet);

      const response = await request(app)
        .post('/api/code-snippets/upload-text')
        .send({
          content: 'print("Hello")',
          language: 'python',
          filename: 'snippet.py',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(expect.objectContaining({
        id: mockCodeSnippet.id,
        content: mockCodeSnippet.content,
        language: mockCodeSnippet.language,
        filename: mockCodeSnippet.filename,
      }));

      expect(mockService.storeCodeSnippet).toHaveBeenCalledWith(
        'print("Hello")',
        'python',
        'snippet.py'
      );
    });

    it('should auto-detect language when not provided', async () => {
      const mockCodeSnippet = {
        id: 'test-id',
        content: 'function test() {}',
        language: 'javascript',
        filename: 'snippet.txt',
        size: 18,
        uploadedAt: new Date(),
      };

      mockService.storeCodeSnippet.mockResolvedValue(mockCodeSnippet);

      await request(app)
        .post('/api/code-snippets/upload-text')
        .send({
          content: 'function test() {}',
          filename: 'snippet.txt',
        })
        .expect(201);

      expect(mockService.storeCodeSnippet).toHaveBeenCalledWith(
        'function test() {}',
        'javascript',
        'snippet.txt'
      );
    });

    it('should use default filename when not provided', async () => {
      const mockCodeSnippet = {
        id: 'test-id',
        content: 'test content',
        language: 'plaintext',
        filename: 'snippet.txt',
        size: 12,
        uploadedAt: new Date(),
      };

      mockService.storeCodeSnippet.mockResolvedValue(mockCodeSnippet);

      await request(app)
        .post('/api/code-snippets/upload-text')
        .send({
          content: 'test content',
        })
        .expect(201);

      expect(mockService.storeCodeSnippet).toHaveBeenCalledWith(
        'test content',
        'plaintext',
        'snippet.txt'
      );
    });

    it('should return 400 when content is missing', async () => {
      const response = await request(app)
        .post('/api/code-snippets/upload-text')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Content is required');
    });

    it('should return 400 for invalid content', async () => {
      const response = await request(app)
        .post('/api/code-snippets/upload-text')
        .send({
          content: '   ', // Whitespace-only content
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Content validation failed');
    });
  });

  describe('GET /:id', () => {
    it('should retrieve a code snippet by ID', async () => {
      const mockCodeSnippet = {
        id: 'test-id',
        content: 'console.log("test");',
        language: 'javascript',
        filename: 'test.js',
        size: 20,
        uploadedAt: new Date(),
      };

      mockService.getCodeSnippet.mockResolvedValue(mockCodeSnippet);

      const response = await request(app)
        .get('/api/code-snippets/test-id')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(expect.objectContaining({
        id: mockCodeSnippet.id,
        content: mockCodeSnippet.content,
        language: mockCodeSnippet.language,
        filename: mockCodeSnippet.filename,
      }));

      expect(mockService.getCodeSnippet).toHaveBeenCalledWith('test-id');
    });

    it('should return 404 for non-existent ID', async () => {
      mockService.getCodeSnippet.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/code-snippets/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Code snippet not found');
    });

    it('should return 400 for missing ID', async () => {
      const response = await request(app)
        .get('/api/code-snippets/')
        .expect(404); // Express returns 404 for missing route parameter
    });

    it('should handle service errors gracefully', async () => {
      mockService.getCodeSnippet.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/code-snippets/test-id')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('DELETE /:id', () => {
    it('should delete a code snippet successfully', async () => {
      mockService.deleteCodeSnippet.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/code-snippets/test-id')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Code snippet deleted successfully');
      expect(mockService.deleteCodeSnippet).toHaveBeenCalledWith('test-id');
    });

    it('should return 404 for non-existent ID', async () => {
      mockService.deleteCodeSnippet.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/code-snippets/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Code snippet not found');
    });

    it('should handle service errors gracefully', async () => {
      mockService.deleteCodeSnippet.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/api/code-snippets/test-id')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
    });
  });
});