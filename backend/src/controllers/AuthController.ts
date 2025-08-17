import { Request, Response } from 'express';
import { userService } from '../services/UserService';
import { JWTUtils } from '../utils/jwt';
import { CreateUserData, LoginCredentials } from '../models/User';

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const userData: CreateUserData = req.body;

      // Validate required fields
      if (!userData.username || !userData.email || !userData.password) {
        res.status(400).json({
          error: 'Missing required fields',
          message: 'Username, email, and password are required',
        });
        return;
      }

      const user = await userService.register(userData);
      
      // Generate JWT tokens
      const tokenPair = JWTUtils.generateTokenPair({
        userId: user.id,
        email: user.email,
        username: user.username,
      });

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', tokenPair.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(201).json({
        message: 'User registered successfully',
        user: user.toJSON(),
        accessToken: tokenPair.accessToken,
      });
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error instanceof Error) {
        res.status(400).json({
          error: 'Registration failed',
          message: error.message,
        });
      } else {
        res.status(500).json({
          error: 'Internal server error',
          message: 'An unexpected error occurred during registration',
        });
      }
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const credentials: LoginCredentials = req.body;

      // Validate required fields
      if (!credentials.email || !credentials.password) {
        res.status(400).json({
          error: 'Missing credentials',
          message: 'Email and password are required',
        });
        return;
      }

      const user = await userService.login(credentials);
      
      // Generate JWT tokens
      const tokenPair = JWTUtils.generateTokenPair({
        userId: user.id,
        email: user.email,
        username: user.username,
      });

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', tokenPair.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        message: 'Login successful',
        user: user.toJSON(),
        accessToken: tokenPair.accessToken,
      });
    } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof Error) {
        res.status(401).json({
          error: 'Login failed',
          message: error.message,
        });
      } else {
        res.status(500).json({
          error: 'Internal server error',
          message: 'An unexpected error occurred during login',
        });
      }
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        res.status(401).json({
          error: 'No refresh token',
          message: 'Refresh token not found',
        });
        return;
      }

      const payload = JWTUtils.verifyRefreshToken(refreshToken);
      
      // Verify user still exists
      const user = await userService.getUserById(payload.userId);
      if (!user) {
        res.status(401).json({
          error: 'User not found',
          message: 'User associated with token no longer exists',
        });
        return;
      }

      // Generate new token pair
      const newTokenPair = JWTUtils.generateTokenPair({
        userId: user.id,
        email: user.email,
        username: user.username,
      });

      // Set new refresh token as httpOnly cookie
      res.cookie('refreshToken', newTokenPair.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        message: 'Token refreshed successfully',
        accessToken: newTokenPair.accessToken,
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      
      res.status(401).json({
        error: 'Token refresh failed',
        message: 'Invalid or expired refresh token',
      });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      // Clear the refresh token cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      res.json({
        message: 'Logout successful',
      });
    } catch (error) {
      console.error('Logout error:', error);
      
      res.status(500).json({
        error: 'Logout failed',
        message: 'An error occurred during logout',
      });
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Not authenticated',
          message: 'User not found in request',
        });
        return;
      }

      const user = await userService.getUserById(req.user.userId);
      if (!user) {
        res.status(404).json({
          error: 'User not found',
          message: 'User profile not found',
        });
        return;
      }

      res.json({
        user: user.toJSON(),
      });
    } catch (error) {
      console.error('Get profile error:', error);
      
      res.status(500).json({
        error: 'Failed to get profile',
        message: 'An error occurred while fetching user profile',
      });
    }
  }
}

export const authController = new AuthController();