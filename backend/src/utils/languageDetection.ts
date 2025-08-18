/**
 * Detect programming language from file extension or content
 */
export function detectLanguageFromFilename(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  const extensionMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'cc': 'cpp',
    'cxx': 'cpp',
    'c': 'c',
    'h': 'c',
    'hpp': 'cpp',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'bash',
    'ps1': 'powershell',
    'sql': 'sql',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'dockerfile': 'dockerfile',
    'r': 'r',
    'matlab': 'matlab',
    'm': 'matlab',
    'pl': 'perl',
    'lua': 'lua',
    'vim': 'vim',
    'dart': 'dart',
    'elm': 'elm',
    'clj': 'clojure',
    'cljs': 'clojure',
    'ex': 'elixir',
    'exs': 'elixir',
    'erl': 'erlang',
    'hrl': 'erlang',
    'hs': 'haskell',
    'lhs': 'haskell',
    'ml': 'ocaml',
    'mli': 'ocaml',
    'fs': 'fsharp',
    'fsx': 'fsharp',
    'fsi': 'fsharp',
  };

  return extensionMap[extension || ''] || 'plaintext';
}

/**
 * Basic content-based language detection using simple heuristics
 */
export function detectLanguageFromContent(content: string): string {
  const lines = content.split('\n').slice(0, 10); // Check first 10 lines
  const contentLower = content.toLowerCase();

  // Check for TypeScript first (more specific)
  if (contentLower.includes('interface ') || contentLower.includes(': string') || contentLower.includes(': number')) {
    return 'typescript';
  }

  // Check for JavaScript patterns
  if (contentLower.includes('function ') || contentLower.includes('const ') || contentLower.includes('let ')) {
    return 'javascript';
  }

  if (contentLower.includes('def ') || contentLower.includes('import ') || contentLower.includes('from ')) {
    return 'python';
  }

  if (contentLower.includes('public class ') || contentLower.includes('private ') || contentLower.includes('public static void main')) {
    return 'java';
  }

  if (contentLower.includes('#include') || contentLower.includes('int main(')) {
    return 'cpp';
  }

  if (contentLower.includes('<?php') || contentLower.includes('<?=')) {
    return 'php';
  }

  if (contentLower.includes('package main') || contentLower.includes('func main()')) {
    return 'go';
  }

  if (contentLower.includes('fn main()') || contentLower.includes('use std::')) {
    return 'rust';
  }

  if (contentLower.includes('using system') || contentLower.includes('namespace ')) {
    return 'csharp';
  }

  // Check for HTML/XML
  if (contentLower.includes('<html') || contentLower.includes('<!doctype')) {
    return 'html';
  }

  // Check for CSS
  if (contentLower.includes('{') && contentLower.includes('}') && contentLower.includes(':')) {
    const cssPattern = /[a-z-]+\s*:\s*[^;]+;/;
    if (cssPattern.test(contentLower)) {
      return 'css';
    }
  }

  // Check for JSON
  try {
    JSON.parse(content);
    return 'json';
  } catch {
    // Not JSON
  }

  return 'plaintext';
}

/**
 * Get supported programming languages
 */
export function getSupportedLanguages(): string[] {
  return [
    'javascript',
    'typescript',
    'python',
    'java',
    'cpp',
    'c',
    'csharp',
    'php',
    'ruby',
    'go',
    'rust',
    'swift',
    'kotlin',
    'scala',
    'bash',
    'powershell',
    'sql',
    'html',
    'css',
    'scss',
    'sass',
    'less',
    'json',
    'xml',
    'yaml',
    'markdown',
    'dockerfile',
    'r',
    'matlab',
    'perl',
    'lua',
    'vim',
    'dart',
    'elm',
    'clojure',
    'elixir',
    'erlang',
    'haskell',
    'ocaml',
    'fsharp',
    'plaintext',
  ];
}