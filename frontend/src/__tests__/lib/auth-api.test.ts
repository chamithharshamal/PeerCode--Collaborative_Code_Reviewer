import { authAPI, RegisterData, LoginData } from '../../lib/auth-api';

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('AuthAPI', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    localStorage.clear();
  });

  describe('register', () => {
    const registerData: RegisterData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    };

    it('should register user successfully', async () => {
      const mockResponse = {
        message: 'User registered successfully',
        user: {
          id: '123',
          username: 'testuser',
          email: 'test@example.com',
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
        },
        accessToken: 'mock-access-token',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await authAPI.register(registerData);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/auth/register',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(registerData),
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should throw error on registration failure', async () => {
      const errorResponse = {
        message: 'Email already exists',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => errorResponse,
      } as Response);

      await expect(authAPI.register(registerData)).rejects.toThrow('Email already exists');
    });
  });

  describe('login', () => {
    const loginData: LoginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user successfully', async () => {
      const mockResponse = {
        message: 'Login successful',
        user: {
          id: '123',
          username: 'testuser',
          email: 'test@example.com',
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
        },
        accessToken: 'mock-access-token',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await authAPI.login(loginData);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(loginData),
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should throw error on login failure', async () => {
      const errorResponse = {
        message: 'Invalid email or password',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => errorResponse,
      } as Response);

      await expect(authAPI.login(loginData)).rejects.toThrow('Invalid email or password');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Logout successful' }),
      } as Response);

      await authAPI.logout();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/auth/logout',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );
    });

    it('should throw error on logout failure', async () => {
      const errorResponse = {
        message: 'Logout failed',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => errorResponse,
      } as Response);

      await expect(authAPI.logout()).rejects.toThrow('Logout failed');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockResponse = {
        message: 'Token refreshed successfully',
        accessToken: 'new-access-token',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await authAPI.refreshToken();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/auth/refresh',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should throw error on refresh failure', async () => {
      const errorResponse = {
        message: 'Invalid or expired refresh token',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => errorResponse,
      } as Response);

      await expect(authAPI.refreshToken()).rejects.toThrow('Invalid or expired refresh token');
    });
  });

  describe('getProfile', () => {
    it('should get profile successfully with token', async () => {
      localStorage.setItem('accessToken', 'mock-access-token');

      const mockResponse = {
        user: {
          id: '123',
          username: 'testuser',
          email: 'test@example.com',
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await authAPI.getProfile();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/auth/profile',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-access-token',
          },
          credentials: 'include',
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should get profile without token', async () => {
      const mockResponse = {
        user: {
          id: '123',
          username: 'testuser',
          email: 'test@example.com',
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await authAPI.getProfile();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/auth/profile',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should throw error on profile fetch failure', async () => {
      const errorResponse = {
        message: 'User not found',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => errorResponse,
      } as Response);

      await expect(authAPI.getProfile()).rejects.toThrow('User not found');
    });
  });
});