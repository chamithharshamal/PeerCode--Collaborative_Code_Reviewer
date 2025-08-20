import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../lib/auth-context';
import { authAPI } from '../../lib/auth-api';

// Mock the auth API
jest.mock('../../lib/auth-api');
const mockAuthAPI = authAPI as jest.Mocked<typeof authAPI>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Test component to access auth context
function TestComponent() {
  const { user, isLoading, isAuthenticated, login, register, logout } = useAuth();

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid="user">{user ? user.username : 'no-user'}</div>
      <button onClick={() => login({ email: 'test@example.com', password: 'password' })}>
        Login
      </button>
      <button onClick={() => register({ username: 'test', email: 'test@example.com', password: 'password' })}>
        Register
      </button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('should provide initial unauthenticated state', async () => {
    mockAuthAPI.getProfile.mockRejectedValue(new Error('No token'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    expect(screen.getByTestId('user')).toHaveTextContent('no-user');
  });

  it('should initialize with existing token', async () => {
    const mockUser = {
      id: '123',
      username: 'testuser',
      email: 'test@example.com',
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };

    mockLocalStorage.getItem.mockReturnValue('mock-token');
    mockAuthAPI.getProfile.mockResolvedValue({ user: mockUser });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user')).toHaveTextContent('testuser');
  });

  it('should handle login successfully', async () => {
    const mockUser = {
      id: '123',
      username: 'testuser',
      email: 'test@example.com',
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };

    mockAuthAPI.getProfile.mockRejectedValueOnce(new Error('No token'));
    mockAuthAPI.login.mockResolvedValue({
      message: 'Login successful',
      user: mockUser,
      accessToken: 'new-token',
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    await act(async () => {
      screen.getByText('Login').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('testuser');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('accessToken', 'new-token');
  });

  it('should handle register successfully', async () => {
    const mockUser = {
      id: '123',
      username: 'testuser',
      email: 'test@example.com',
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };

    mockAuthAPI.getProfile.mockRejectedValueOnce(new Error('No token'));
    mockAuthAPI.register.mockResolvedValue({
      message: 'Registration successful',
      user: mockUser,
      accessToken: 'new-token',
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    await act(async () => {
      screen.getByText('Register').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('testuser');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('accessToken', 'new-token');
  });

  it('should handle logout successfully', async () => {
    const mockUser = {
      id: '123',
      username: 'testuser',
      email: 'test@example.com',
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };

    mockLocalStorage.getItem.mockReturnValue('mock-token');
    mockAuthAPI.getProfile.mockResolvedValue({ user: mockUser });
    mockAuthAPI.logout.mockResolvedValue();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    });

    await act(async () => {
      screen.getByText('Logout').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('accessToken');
  });

  it('should handle token refresh on expired token', async () => {
    const mockUser = {
      id: '123',
      username: 'testuser',
      email: 'test@example.com',
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };

    mockLocalStorage.getItem.mockReturnValue('expired-token');
    mockAuthAPI.getProfile.mockRejectedValue(new Error('Token expired'));
    mockAuthAPI.refreshToken.mockResolvedValue({
      message: 'Token refreshed',
      accessToken: 'new-token',
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    // Verify refresh token was called
    expect(mockAuthAPI.refreshToken).toHaveBeenCalled();
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('accessToken', 'new-token');
  });

  it('should handle failed token refresh', async () => {
    mockLocalStorage.getItem.mockReturnValue('expired-token');
    mockAuthAPI.getProfile.mockRejectedValue(new Error('Token expired'));
    mockAuthAPI.refreshToken.mockRejectedValue(new Error('Refresh failed'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    // Verify refresh token was attempted and failed
    expect(mockAuthAPI.refreshToken).toHaveBeenCalled();
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('accessToken');
    
    // Should not be authenticated after failed refresh
    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    expect(screen.getByTestId('user')).toHaveTextContent('no-user');
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});