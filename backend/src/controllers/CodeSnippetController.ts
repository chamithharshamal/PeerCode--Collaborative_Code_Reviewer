import { Request, Response } from 'express';
import multer from 'multer';
import { codeSnippetService } from '../services/CodeSnippetService';
import { validateFile } from '../utils/fileValidation';
import { detectLanguageFromFilename, detectLanguageFromContent } from '../utils/languageDetection';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024, // 1MB limit
    files: 1, // Only one file at a time
  },
  fileFilter: (req, file, cb) => {
    // Allow all files - detailed validation happens in the controller
    cb(null, true);
  },
});

export const uploadMiddleware = upload.single('file');

/**
 * Upload a code snippet file
 */
export async function uploadCodeSnippet(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
      return;
    }

    const { originalname, buffer, size } = req.file;
    const content = buffer.toString('utf8');

    // Validate the file
    const validation = validateFile(originalname, content, size);
    if (!validation.isValid) {
      res.status(400).json({
        success: false,
        error: 'File validation failed',
        details: validation.errors,
      });
      return;
    }

    // Detect programming language
    let language = detectLanguageFromFilename(originalname);
    if (language === 'plaintext') {
      language = detectLanguageFromContent(content);
    }

    // Store the code snippet
    const codeSnippet = await codeSnippetService.storeCodeSnippet(
      content,
      language,
      originalname
    );

    res.status(201).json({
      success: true,
      data: codeSnippet,
    });
  } catch (error) {
    console.error('Error uploading code snippet:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Upload code snippet from text content (alternative to file upload)
 */
export async function uploadCodeSnippetText(req: Request, res: Response): Promise<void> {
  try {
    const { content, language, filename } = req.body;

    if (!content) {
      res.status(400).json({
        success: false,
        error: 'Content is required',
      });
      return;
    }

    const size = Buffer.byteLength(content, 'utf8');
    const actualFilename = filename || 'snippet.txt';

    // Validate the content
    const validation = validateFile(actualFilename, content, size);
    if (!validation.isValid) {
      res.status(400).json({
        success: false,
        error: 'Content validation failed',
        details: validation.errors,
      });
      return;
    }

    // Determine language
    let detectedLanguage = language;
    if (!detectedLanguage) {
      detectedLanguage = detectLanguageFromFilename(actualFilename);
      if (detectedLanguage === 'plaintext') {
        detectedLanguage = detectLanguageFromContent(content);
      }
    }

    // Store the code snippet
    const codeSnippet = await codeSnippetService.storeCodeSnippet(
      content,
      detectedLanguage,
      actualFilename
    );

    res.status(201).json({
      success: true,
      data: codeSnippet,
    });
  } catch (error) {
    console.error('Error uploading code snippet text:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Get a code snippet by ID
 */
export async function getCodeSnippet(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Code snippet ID is required',
      });
      return;
    }

    const codeSnippet = await codeSnippetService.getCodeSnippet(id);

    if (!codeSnippet) {
      res.status(404).json({
        success: false,
        error: 'Code snippet not found',
      });
      return;
    }

    res.json({
      success: true,
      data: codeSnippet,
    });
  } catch (error) {
    console.error('Error getting code snippet:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Delete a code snippet by ID
 */
export async function deleteCodeSnippet(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Code snippet ID is required',
      });
      return;
    }

    const deleted = await codeSnippetService.deleteCodeSnippet(id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Code snippet not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Code snippet deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting code snippet:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}