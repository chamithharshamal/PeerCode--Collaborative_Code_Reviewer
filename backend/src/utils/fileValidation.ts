import { getSupportedLanguages } from './languageDetection';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedExtensions?: string[];
  maxLines?: number;
}

const DEFAULT_OPTIONS: Required<FileValidationOptions> = {
  maxSizeBytes: 1024 * 1024, // 1MB
  allowedExtensions: [
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'cc', 'cxx', 'c', 'h', 'hpp',
    'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'sh', 'bash', 'zsh',
    'ps1', 'sql', 'html', 'css', 'scss', 'sass', 'less', 'json', 'xml', 'yaml',
    'yml', 'md', 'dockerfile', 'r', 'matlab', 'm', 'pl', 'lua', 'vim', 'dart',
    'elm', 'clj', 'cljs', 'ex', 'exs', 'erl', 'hrl', 'hs', 'lhs', 'ml', 'mli',
    'fs', 'fsx', 'fsi', 'txt'
  ],
  maxLines: 10000,
};

/**
 * Validate file size
 */
export function validateFileSize(size: number, maxSize: number = DEFAULT_OPTIONS.maxSizeBytes): ValidationResult {
  const errors: string[] = [];

  if (size > maxSize) {
    errors.push(`File size (${formatBytes(size)}) exceeds maximum allowed size (${formatBytes(maxSize)})`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate file extension
 */
export function validateFileExtension(
  filename: string,
  allowedExtensions: string[] = DEFAULT_OPTIONS.allowedExtensions
): ValidationResult {
  const errors: string[] = [];
  const parts = filename.split('.');
  
  // If there's only one part or the filename starts with a dot (hidden file), no extension
  if (parts.length === 1 || (parts.length === 2 && parts[0] === '')) {
    errors.push('File must have an extension');
  } else {
    const extension = parts.pop()?.toLowerCase();
    if (!extension || !allowedExtensions.includes(extension)) {
      errors.push(`File extension '.${extension}' is not supported. Allowed extensions: ${allowedExtensions.join(', ')}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate file content
 */
export function validateFileContent(content: string, maxLines: number = DEFAULT_OPTIONS.maxLines): ValidationResult {
  const errors: string[] = [];

  // Check if content is empty
  if (!content.trim()) {
    errors.push('File content cannot be empty');
    return { isValid: false, errors };
  }

  // Check line count
  const lines = content.split('\n');
  if (lines.length > maxLines) {
    errors.push(`File has too many lines (${lines.length}). Maximum allowed: ${maxLines}`);
  }

  // Check for binary content (basic check)
  if (containsBinaryContent(content)) {
    errors.push('Binary files are not supported');
  }

  // Check for extremely long lines
  const maxLineLength = 10000;
  const longLines = lines.filter(line => line.length > maxLineLength);
  if (longLines.length > 0) {
    errors.push(`File contains lines that are too long (max ${maxLineLength} characters per line)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Comprehensive file validation
 */
export function validateFile(
  filename: string,
  content: string,
  size: number,
  options: FileValidationOptions = {}
): ValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: string[] = [];

  // Validate file size
  const sizeValidation = validateFileSize(size, opts.maxSizeBytes);
  errors.push(...sizeValidation.errors);

  // Validate file extension
  const extensionValidation = validateFileExtension(filename, opts.allowedExtensions);
  errors.push(...extensionValidation.errors);

  // Validate file content
  const contentValidation = validateFileContent(content, opts.maxLines);
  errors.push(...contentValidation.errors);

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if content contains binary data
 */
function containsBinaryContent(content: string): boolean {
  // Check for null bytes or other binary indicators
  return content.includes('\0') || /[\x00-\x08\x0E-\x1F\x7F]/.test(content);
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get validation options with defaults
 */
export function getValidationOptions(options: FileValidationOptions = {}): Required<FileValidationOptions> {
  return { ...DEFAULT_OPTIONS, ...options };
}