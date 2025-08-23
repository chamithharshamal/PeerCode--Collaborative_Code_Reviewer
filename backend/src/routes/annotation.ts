import { Router } from 'express';
import { AnnotationController } from '../controllers/AnnotationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const annotationController = new AnnotationController();

// All annotation routes require authentication
router.use(authenticateToken);

// Annotation CRUD operations
router.post('/annotations', annotationController.createAnnotation);
router.get('/annotations/:id', annotationController.getAnnotation);
router.put('/annotations/:id', annotationController.updateAnnotation);
router.delete('/annotations/:id', annotationController.deleteAnnotation);

// Session-specific annotation operations
router.get('/sessions/:sessionId/annotations', annotationController.getSessionAnnotations);
router.get('/sessions/:sessionId/annotations/line-range', annotationController.getAnnotationsByLineRange);
router.delete('/sessions/:sessionId/annotations', annotationController.clearSessionAnnotations);

// User-specific annotation operations
router.get('/users/:userId/annotations', annotationController.getUserAnnotations);

export default router;