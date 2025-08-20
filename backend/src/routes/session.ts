import { Router, Request, Response } from 'express';
import { SessionController } from '../controllers/SessionController';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const sessionController = new SessionController();

// All session routes require authentication
router.use(authenticateToken);

// Create a new session
router.post('/', (req: Request, res: Response) => sessionController.createSession(req as AuthenticatedRequest, res));

// Join an existing session
router.post('/:sessionId/join', (req: Request, res: Response) => sessionController.joinSession(req as AuthenticatedRequest, res));

// Leave a session
router.post('/:sessionId/leave', (req: Request, res: Response) => sessionController.leaveSession(req as AuthenticatedRequest, res));

// Get session details
router.get('/:sessionId', (req: Request, res: Response) => sessionController.getSession(req as AuthenticatedRequest, res));

// Get user's sessions
router.get('/user/sessions', (req: Request, res: Response) => sessionController.getUserSessions(req as AuthenticatedRequest, res));

// Update session activity (heartbeat)
router.post('/:sessionId/activity', (req: Request, res: Response) => sessionController.updateSessionActivity(req as AuthenticatedRequest, res));

export default router;