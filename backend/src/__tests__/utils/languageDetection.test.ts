import {
  detectLanguageFromFilename,
  detectLanguageFromContent,
  getSupportedLanguages,
} from '../../utils/languageDetection';

describe('Language Detection', () => {
  describe('detectLanguageFromFilename', () => {
    it('should detect JavaScript from .js extension', () => {
      expect(detectLanguageFromFilename('app.js')).toBe('javascript');
      expect(detectLanguageFromFilename('component.jsx')).toBe('javascript');
    });

    it('should detect TypeScript from .ts extension', () => {
      expect(detectLanguageFromFilename('app.ts')).toBe('typescript');
      expect(detectLanguageFromFilename('component.tsx')).toBe('typescript');
    });

    it('should detect Python from .py extension', () => {
      expect(detectLanguageFromFilename('script.py')).toBe('python');
    });

    it('should detect Java from .java extension', () => {
      expect(detectLanguageFromFilename('Main.java')).toBe('java');
    });

    it('should detect C++ from various extensions', () => {
      expect(detectLanguageFromFilename('main.cpp')).toBe('cpp');
      expect(detectLanguageFromFilename('main.cc')).toBe('cpp');
      expect(detectLanguageFromFilename('main.cxx')).toBe('cpp');
      expect(detectLanguageFromFilename('header.hpp')).toBe('cpp');
    });

    it('should detect C from .c extension', () => {
      expect(detectLanguageFromFilename('main.c')).toBe('c');
      expect(detectLanguageFromFilename('header.h')).toBe('c');
    });

    it('should be case insensitive', () => {
      expect(detectLanguageFromFilename('App.JS')).toBe('javascript');
      expect(detectLanguageFromFilename('Script.PY')).toBe('python');
    });

    it('should return plaintext for unknown extensions', () => {
      expect(detectLanguageFromFilename('unknown.xyz')).toBe('plaintext');
      expect(detectLanguageFromFilename('noextension')).toBe('plaintext');
    });

    it('should handle files with multiple dots', () => {
      expect(detectLanguageFromFilename('my.config.js')).toBe('javascript');
      expect(detectLanguageFromFilename('test.spec.ts')).toBe('typescript');
    });
  });

  describe('detectLanguageFromContent', () => {
    it('should detect JavaScript from function syntax', () => {
      const jsContent = 'function hello() { console.log("Hello"); }';
      expect(detectLanguageFromContent(jsContent)).toBe('javascript');
    });

    it('should detect TypeScript from type annotations', () => {
      const tsContent = 'function hello(name: string): void { console.log(name); }';
      expect(detectLanguageFromContent(tsContent)).toBe('typescript');
      
      const tsInterface = 'interface User { name: string; age: number; }';
      expect(detectLanguageFromContent(tsInterface)).toBe('typescript');
    });

    it('should detect Python from def keyword', () => {
      const pyContent = 'def hello():\n    print("Hello")';
      expect(detectLanguageFromContent(pyContent)).toBe('python');
    });

    it('should detect Python from import statements', () => {
      const pyContent = 'import os\nfrom sys import argv';
      expect(detectLanguageFromContent(pyContent)).toBe('python');
    });

    it('should detect Java from class syntax', () => {
      const javaContent = 'public class Main {\n    public static void main(String[] args) {}\n}';
      expect(detectLanguageFromContent(javaContent)).toBe('java');
    });

    it('should detect C++ from includes and main', () => {
      const cppContent = '#include <iostream>\nint main() { return 0; }';
      expect(detectLanguageFromContent(cppContent)).toBe('cpp');
    });

    it('should detect PHP from opening tags', () => {
      const phpContent = '<?php\necho "Hello World";\n?>';
      expect(detectLanguageFromContent(phpContent)).toBe('php');
    });

    it('should detect Go from package and func main', () => {
      const goContent = 'package main\nfunc main() { fmt.Println("Hello") }';
      expect(detectLanguageFromContent(goContent)).toBe('go');
    });

    it('should detect Rust from fn main', () => {
      const rustContent = 'fn main() {\n    println!("Hello");\n}';
      expect(detectLanguageFromContent(rustContent)).toBe('rust');
    });

    it('should detect C# from using and namespace', () => {
      const csContent = 'using System;\nnamespace MyApp { class Program {} }';
      expect(detectLanguageFromContent(csContent)).toBe('csharp');
    });

    it('should detect HTML from tags', () => {
      const htmlContent = '<!DOCTYPE html>\n<html><head><title>Test</title></head></html>';
      expect(detectLanguageFromContent(htmlContent)).toBe('html');
    });

    it('should detect CSS from style rules', () => {
      const cssContent = 'body {\n  margin: 0;\n  padding: 10px;\n}';
      expect(detectLanguageFromContent(cssContent)).toBe('css');
    });

    it('should detect JSON from valid JSON structure', () => {
      const jsonContent = '{"name": "test", "version": "1.0.0"}';
      expect(detectLanguageFromContent(jsonContent)).toBe('json');
    });

    it('should return plaintext for unrecognizable content', () => {
      const unknownContent = 'This is just plain text with no programming syntax.';
      expect(detectLanguageFromContent(unknownContent)).toBe('plaintext');
    });

    it('should be case insensitive', () => {
      const jsContent = 'FUNCTION HELLO() { CONSOLE.LOG("Hello"); }';
      expect(detectLanguageFromContent(jsContent)).toBe('javascript');
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return an array of supported languages', () => {
      const languages = getSupportedLanguages();
      
      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length).toBeGreaterThan(0);
    });

    it('should include common programming languages', () => {
      const languages = getSupportedLanguages();
      
      expect(languages).toContain('javascript');
      expect(languages).toContain('typescript');
      expect(languages).toContain('python');
      expect(languages).toContain('java');
      expect(languages).toContain('cpp');
      expect(languages).toContain('c');
      expect(languages).toContain('csharp');
      expect(languages).toContain('php');
      expect(languages).toContain('ruby');
      expect(languages).toContain('go');
      expect(languages).toContain('rust');
    });

    it('should include markup and data languages', () => {
      const languages = getSupportedLanguages();
      
      expect(languages).toContain('html');
      expect(languages).toContain('css');
      expect(languages).toContain('json');
      expect(languages).toContain('xml');
      expect(languages).toContain('yaml');
      expect(languages).toContain('markdown');
    });

    it('should include plaintext as fallback', () => {
      const languages = getSupportedLanguages();
      expect(languages).toContain('plaintext');
    });
  });
});