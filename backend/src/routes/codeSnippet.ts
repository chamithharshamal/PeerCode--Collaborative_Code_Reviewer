import { Router } from 'express';
import {
  uploadCodeSnippet,
  uploadCodeSnippetText,
  getCodeSnippet,
  deleteCodeSnippet,
  uploadMiddleware,
} from '../controllers/CodeSnippetController';

const router = Router();

// Upload code snippet file
router.post('/upload', uploadMiddleware, uploadCodeSnippet);

// Upload code snippet from text content
router.post('/upload-text', uploadCodeSnippetText);

// Get code snippet by ID
router.get('/:id', getCodeSnippet);

// Delete code snippet by ID
router.delete('/:id', deleteCodeSnippet);

export default router;