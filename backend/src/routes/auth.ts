import { Router } from 'express';
import { authController } from '../controllers/AuthController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.post('/refresh', authController.refreshToken.bind(authController));
router.post('/logout', authController.logout.bind(authController));

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile.bind(authController));

export default router;