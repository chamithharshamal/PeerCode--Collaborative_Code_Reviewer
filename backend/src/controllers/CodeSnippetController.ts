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

/**
 * Get all code snippets
 */
export async function getAllCodeSnippets(req: Request, res: Response): Promise<void> {
  try {
    const { language, search, limit = '50', offset = '0' } = req.query;

    let snippets;
    if (language && typeof language === 'string') {
      snippets = await codeSnippetService.getCodeSnippetsByLanguage(language);
    } else if (search && typeof search === 'string') {
      snippets = await codeSnippetService.searchCodeSnippets(search);
    } else {
      snippets = await codeSnippetService.getAllCodeSnippets();
    }

    // Apply pagination
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);
    const paginatedSnippets = snippets.slice(offsetNum, offsetNum + limitNum);

    res.json({
      success: true,
      data: {
        snippets: paginatedSnippets,
        total: snippets.length,
        limit: limitNum,
        offset: offsetNum
      }
    });
  } catch (error) {
    console.error('Error getting code snippets:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Update a code snippet
 */
export async function updateCodeSnippet(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { content, language, filename } = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Code snippet ID is required',
      });
      return;
    }

    const updates: any = {};
    if (content !== undefined) updates.content = content;
    if (language !== undefined) updates.language = language;
    if (filename !== undefined) updates.filename = filename;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        success: false,
        error: 'No updates provided',
      });
      return;
    }

    // If content is being updated, validate it
    if (updates.content) {
      const size = Buffer.byteLength(updates.content, 'utf8');
      const actualFilename = updates.filename || 'snippet.txt';
      const validation = validateFile(actualFilename, updates.content, size);
      
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Content validation failed',
          details: validation.errors,
        });
        return;
      }
    }

    const updatedSnippet = await codeSnippetService.updateCodeSnippet(id, updates);

    if (!updatedSnippet) {
      res.status(404).json({
        success: false,
        error: 'Code snippet not found',
      });
      return;
    }

    res.json({
      success: true,
      data: updatedSnippet,
    });
  } catch (error) {
    console.error('Error updating code snippet:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}