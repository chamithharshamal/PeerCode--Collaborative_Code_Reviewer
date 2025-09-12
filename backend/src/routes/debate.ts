import { Router } from 'express';
import { DebateController } from '../controllers/DebateController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const debateController = new DebateController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Debate session operations
router.post('/', debateController.createDebateSession.bind(debateController));
router.get('/session/:sessionId', debateController.getActiveDebateSessions.bind(debateController));
router.get('/:id', debateController.getDebateSession.bind(debateController));
router.get('/:id/analytics', debateController.getDebateAnalytics.bind(debateController));

// Argument operations
router.post('/:id/arguments/initial', debateController.generateInitialArguments.bind(debateController));
router.post('/:id/arguments', debateController.addUserArgument.bind(debateController));
router.post('/:id/arguments/counter', debateController.generateCounterArgument.bind(debateController));

// Debate lifecycle
router.put('/:id/conclude', debateController.concludeDebate.bind(debateController));
router.put('/:id/abandon', debateController.abandonDebate.bind(debateController));

export default router;
