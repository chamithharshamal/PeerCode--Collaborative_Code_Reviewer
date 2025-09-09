import { HuggingFaceClient } from '../../config/huggingface';

// Mock the HfInference class
jest.mock('@huggingface/inference', () => ({
  HfInference: jest.fn().mockImplementation((apiKey) => ({
    apiKey,
    textGeneration: jest.fn(),
    tokenClassification: jest.fn()
  }))
}));

describe('HuggingFaceClient', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should initialize with API key from environment', () => {
      process.env.HUGGINGFACE_API_KEY = 'test-api-key';
      process.env.HUGGINGFACE_API_URL = 'https://test-api.com';

      const client = new HuggingFaceClient();

      expect(client.getApiKey()).toBe('test-api-key');
      expect(client.isConfigured()).toBe(true);
    });

    it('should handle missing API key gracefully', () => {
      delete process.env.HUGGINGFACE_API_KEY;

      // Mock console.warn to avoid output during tests
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const client = new HuggingFaceClient();

      expect(client.getApiKey()).toBe('');
      expect(client.isConfigured()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'HUGGINGFACE_API_KEY not found in environment variables. AI features will be limited.'
      );

      consoleSpy.mockRestore();
    });

    it('should use default API URL when not specified', () => {
      process.env.HUGGINGFACE_API_KEY = 'test-key';
      delete process.env.HUGGINGFACE_API_URL;

      const client = new HuggingFaceClient();

      expect(client.isConfigured()).toBe(true);
      // The default URL should be used internally
    });
  });

  describe('getClient', () => {
    it('should return HfInference client instance', () => {
      process.env.HUGGINGFACE_API_KEY = 'test-key';

      const client = new HuggingFaceClient();
      const hfClient = client.getClient();

      expect(hfClient).toBeDefined();
      expect(hfClient.apiKey).toBe('test-key');
    });
  });

  describe('isConfigured', () => {
    it('should return true when API key is present', () => {
      process.env.HUGGINGFACE_API_KEY = 'test-key';

      const client = new HuggingFaceClient();

      expect(client.isConfigured()).toBe(true);
    });

    it('should return false when API key is empty', () => {
      process.env.HUGGINGFACE_API_KEY = '';

      const client = new HuggingFaceClient();

      expect(client.isConfigured()).toBe(false);
    });

    it('should return false when API key is undefined', () => {
      delete process.env.HUGGINGFACE_API_KEY;

      const client = new HuggingFaceClient();

      expect(client.isConfigured()).toBe(false);
    });
  });

  describe('getApiKey', () => {
    it('should return the configured API key', () => {
      process.env.HUGGINGFACE_API_KEY = 'my-secret-key';

      const client = new HuggingFaceClient();

      expect(client.getApiKey()).toBe('my-secret-key');
    });

    it('should return empty string when no API key is configured', () => {
      delete process.env.HUGGINGFACE_API_KEY;

      const client = new HuggingFaceClient();

      expect(client.getApiKey()).toBe('');
    });
  });

  describe('singleton behavior', () => {
    it('should export a singleton instance', () => {
      // Import the singleton instance
      const { huggingFaceClient } = require('../../config/huggingface');

      expect(huggingFaceClient).toBeInstanceOf(HuggingFaceClient);
    });
  });
});