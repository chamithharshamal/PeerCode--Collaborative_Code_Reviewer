import {
  validateFileSize,
  validateFileExtension,
  validateFileContent,
  validateFile,
} from '../../utils/fileValidation';

describe('File Validation', () => {
  describe('validateFileSize', () => {
    it('should pass validation for files within size limit', () => {
      const result = validateFileSize(1000, 2000);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for files exceeding size limit', () => {
      const result = validateFileSize(2000, 1000);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('exceeds maximum allowed size');
    });

    it('should use default size limit when not specified', () => {
      const result = validateFileSize(2 * 1024 * 1024); // 2MB
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('exceeds maximum allowed size');
    });
  });

  describe('validateFileExtension', () => {
    it('should pass validation for supported extensions', () => {
      const supportedExtensions = ['js', 'ts', 'py', 'java'];
      
      expect(validateFileExtension('test.js', supportedExtensions).isValid).toBe(true);
      expect(validateFileExtension('test.ts', supportedExtensions).isValid).toBe(true);
      expect(validateFileExtension('test.py', supportedExtensions).isValid).toBe(true);
      expect(validateFileExtension('test.java', supportedExtensions).isValid).toBe(true);
    });

    it('should fail validation for unsupported extensions', () => {
      const supportedExtensions = ['js', 'ts'];
      const result = validateFileExtension('test.exe', supportedExtensions);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('not supported');
    });

    it('should fail validation for files without extension', () => {
      const result = validateFileExtension('noextension');
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('must have an extension');
    });

    it('should be case insensitive', () => {
      const result = validateFileExtension('test.JS');
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateFileContent', () => {
    it('should pass validation for normal text content', () => {
      const content = 'function hello() {\n  console.log("Hello, world!");\n}';
      const result = validateFileContent(content);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for empty content', () => {
      const result = validateFileContent('');
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('cannot be empty');
    });

    it('should fail validation for whitespace-only content', () => {
      const result = validateFileContent('   \n\t  \n  ');
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('cannot be empty');
    });

    it('should fail validation for files with too many lines', () => {
      const content = Array(11000).fill('line').join('\n');
      const result = validateFileContent(content, 10000);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('too many lines');
    });

    it('should fail validation for binary content', () => {
      const content = 'Hello\x00World';
      const result = validateFileContent(content);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Binary files are not supported');
    });

    it('should fail validation for extremely long lines', () => {
      const longLine = 'a'.repeat(10001);
      const result = validateFileContent(longLine);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('lines that are too long');
    });
  });

  describe('validateFile', () => {
    it('should pass comprehensive validation for valid files', () => {
      const content = 'function test() { return "hello"; }';
      const result = validateFile('test.js', content, content.length);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when any check fails', () => {
      const content = 'function test() { return "hello"; }';
      const result = validateFile('test.exe', content, content.length);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should accumulate multiple validation errors', () => {
      const content = ''; // Empty content
      const result = validateFile('test.exe', content, 2 * 1024 * 1024); // Too large and wrong extension
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should respect custom validation options', () => {
      const content = 'test content';
      const options = {
        maxSizeBytes: 5, // Very small limit
        allowedExtensions: ['txt'],
        maxLines: 1,
      };
      
      const result = validateFile('test.txt', content, content.length, options);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('exceeds maximum allowed size');
    });
  });
});