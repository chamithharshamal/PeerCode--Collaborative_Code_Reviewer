import { Request, Response, NextFunction } from 'express';
import { JWTUtils, JWTPayload } from '../utils/jwt';
import { userService } from '../services/UserService';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: JWTPayload;
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = JWTUtils.getTokenFromHeader(req.headers.authorization);
    const payload = JWTUtils.verifyAccessToken(token);

    // Verify user still exists
    const user = await userService.getUserById(payload.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Update last active timestamp
    await userService.updateLastActive(payload.userId);

    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ 
      error: 'Invalid or expired token',
      message: error instanceof Error ? error.message : 'Authentication failed'
    });
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = JWTUtils.getTokenFromHeader(authHeader);
      const payload = JWTUtils.verifyAccessToken(token);
      
      // Verify user still exists
      const user = await userService.getUserById(payload.userId);
      if (user) {
        await userService.updateLastActive(payload.userId);
        req.user = payload;
      }
    }
    next();
  } catch (error) {
    // For optional auth, we don't return an error, just continue without user
    next();
  }
};