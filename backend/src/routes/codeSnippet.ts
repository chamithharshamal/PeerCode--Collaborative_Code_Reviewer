import { Router } from 'express';
import {
  uploadCodeSnippet,
  uploadCodeSnippetText,
  getCodeSnippet,
  deleteCodeSnippet,
  getAllCodeSnippets,
  updateCodeSnippet,
  uploadMiddleware,
} from '../controllers/CodeSnippetController';

const router = Router();

// Get all code snippets (with optional filtering)
router.get('/', getAllCodeSnippets);

// Upload code snippet file
router.post('/upload', uploadMiddleware, uploadCodeSnippet);

// Upload code snippet from text content
router.post('/upload-text', uploadCodeSnippetText);

// Get code snippet by ID
router.get('/:id', getCodeSnippet);

// Update code snippet by ID
router.put('/:id', updateCodeSnippet);

// Delete code snippet by ID
router.delete('/:id', deleteCodeSnippet);

export default router;