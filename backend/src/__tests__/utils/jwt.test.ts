import { JWTUtils, JWTPayload } from '../../utils/jwt';

describe('JWTUtils', () => {
  const mockPayload: JWTPayload = {
    userId: '123',
    email: 'test@example.com',
    username: 'testuser',
  };

  describe('generateTokenPair', () => {
    it('should generate access and refresh tokens', () => {
      const tokenPair = JWTUtils.generateTokenPair(mockPayload);
      
      expect(tokenPair.accessToken).toBeDefined();
      expect(tokenPair.refreshToken).toBeDefined();
      expect(typeof tokenPair.accessToken).toBe('string');
      expect(typeof tokenPair.refreshToken).toBe('string');
      expect(tokenPair.accessToken).not.toBe(tokenPair.refreshToken);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const tokenPair = JWTUtils.generateTokenPair(mockPayload);
      const decoded = JWTUtils.verifyAccessToken(tokenPair.accessToken);
      
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.username).toBe(mockPayload.username);
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        JWTUtils.verifyAccessToken('invalid-token');
      }).toThrow('Invalid or expired access token');
    });

    it('should throw error for empty token', () => {
      expect(() => {
        JWTUtils.verifyAccessToken('');
      }).toThrow('Invalid or expired access token');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const tokenPair = JWTUtils.generateTokenPair(mockPayload);
      const decoded = JWTUtils.verifyRefreshToken(tokenPair.refreshToken);
      
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.username).toBe(mockPayload.username);
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => {
        JWTUtils.verifyRefreshToken('invalid-token');
      }).toThrow('Invalid or expired refresh token');
    });
  });

  describe('getTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'valid-jwt-token';
      const authHeader = `Bearer ${token}`;
      
      const extractedToken = JWTUtils.getTokenFromHeader(authHeader);
      expect(extractedToken).toBe(token);
    });

    it('should throw error for missing header', () => {
      expect(() => {
        JWTUtils.getTokenFromHeader(undefined);
      }).toThrow('No valid authorization header found');
    });

    it('should throw error for invalid header format', () => {
      expect(() => {
        JWTUtils.getTokenFromHeader('Invalid header');
      }).toThrow('No valid authorization header found');
    });

    it('should throw error for header without Bearer prefix', () => {
      expect(() => {
        JWTUtils.getTokenFromHeader('Token abc123');
      }).toThrow('No valid authorization header found');
    });
  });
});