import { Router } from 'express';
import { SessionController } from '../controllers/SessionController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const sessionController = new SessionController();

// All session routes require authentication
router.use(authenticateToken);

// Create a new session
router.post('/', sessionController.createSession);

// Join an existing session
router.post('/:sessionId/join', sessionController.joinSession);

// Leave a session
router.post('/:sessionId/leave', sessionController.leaveSession);

// Get session details
router.get('/:sessionId', sessionController.getSession);

// Get user's sessions
router.get('/user/sessions', sessionController.getUserSessions);

// Update session activity (heartbeat)
router.post('/:sessionId/activity', sessionController.updateSessionActivity);

export default router;