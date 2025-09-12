import { Router } from 'express';
import { AIAnalysisController } from '../controllers/AIAnalysisController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const aiAnalysisController = new AIAnalysisController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route POST /api/ai/analyze
 * @desc Analyze code snippet and generate AI suggestions
 * @access Private
 */
router.post('/analyze', aiAnalysisController.analyzeCode);

/**
 * @route POST /api/ai/analyze-enhanced
 * @desc Enhanced code analysis with categorization and prioritization
 * @access Private
 */
router.post('/analyze-enhanced', aiAnalysisController.analyzeCodeEnhanced);

/**
 * @route POST /api/ai/sessions/:sessionId/analyze
 * @desc Analyze code for a specific session
 * @access Private
 */
router.post('/sessions/:sessionId/analyze', aiAnalysisController.analyzeSessionCode);

/**
 * @route POST /api/ai/sessions/:sessionId/debate/start
 * @desc Start AI debate simulation for a code change
 * @access Private
 */
router.post('/sessions/:sessionId/debate/start', aiAnalysisController.startDebate);

/**
 * @route POST /api/ai/sessions/:sessionId/debate/continue
 * @desc Continue AI debate with user response
 * @access Private
 */
router.post('/sessions/:sessionId/debate/continue', aiAnalysisController.continueDebate);

/**
 * @route GET /api/ai/health
 * @desc Get AI analysis service health status
 * @access Private
 */
router.get('/health', aiAnalysisController.getHealthStatus);

export default router;