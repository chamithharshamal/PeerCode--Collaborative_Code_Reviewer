import { Router } from 'express';
import { SuggestionController } from '../controllers/SuggestionController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const suggestionController = new SuggestionController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Suggestion CRUD operations
router.post('/', suggestionController.createSuggestion.bind(suggestionController));
router.get('/', suggestionController.getSuggestions.bind(suggestionController));
router.get('/analytics', suggestionController.getSuggestionAnalytics.bind(suggestionController));
router.get('/code-snippet/:codeSnippetId', suggestionController.getSuggestionsByCodeSnippet.bind(suggestionController));
router.get('/session/:sessionId', suggestionController.getSuggestionsBySession.bind(suggestionController));
router.get('/:id', suggestionController.getSuggestionById.bind(suggestionController));
router.put('/:id/status', suggestionController.updateSuggestionStatus.bind(suggestionController));
router.put('/:id/feedback', suggestionController.addUserFeedback.bind(suggestionController));
router.post('/:id/interaction', suggestionController.trackInteraction.bind(suggestionController));
router.delete('/:id', suggestionController.deleteSuggestion.bind(suggestionController));

export default router;
