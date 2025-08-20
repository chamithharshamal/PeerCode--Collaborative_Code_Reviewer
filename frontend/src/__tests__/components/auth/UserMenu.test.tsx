import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserMenu } from '../../../components/auth/UserMenu';
import { useAuth } from '../../../lib/auth-context';

// Mock the auth context
jest.mock('../../../lib/auth-context');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('UserMenu', () => {
  const mockUser = {
    id: '123',
    username: 'testuser',
    email: 'test@example.com',
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
  };

  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: mockLogout,
      refreshToken: jest.fn(),
    });

    render(<UserMenu />);

    expect(screen.queryByText('testuser')).not.toBeInTheDocument();
  });

  it('should not render when user is null', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: true,
      login: jest.fn(),
      register: jest.fn(),
      logout: mockLogout,
      refreshToken: jest.fn(),
    });

    render(<UserMenu />);

    expect(screen.queryByText('testuser')).not.toBeInTheDocument();
  });

  it('should render user menu when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      login: jest.fn(),
      register: jest.fn(),
      logout: mockLogout,
      refreshToken: jest.fn(),
    });

    render(<UserMenu />);

    expect(screen.getByText('T')).toBeInTheDocument(); // Avatar initial
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('should show dropdown menu when clicked', async () => {
    const user = userEvent.setup();
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      login: jest.fn(),
      register: jest.fn(),
      logout: mockLogout,
      refreshToken: jest.fn(),
    });

    render(<UserMenu />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });

  it('should hide dropdown menu when clicked outside', async () => {
    const user = userEvent.setup();
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      login: jest.fn(),
      register: jest.fn(),
      logout: mockLogout,
      refreshToken: jest.fn(),
    });

    render(
      <div>
        <UserMenu />
        <div data-testid="outside">Outside element</div>
      </div>
    );

    // Open dropdown
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Sign out')).toBeInTheDocument();

    // Click outside - simulate clicking on the overlay
    const overlay = document.querySelector('.fixed.inset-0.z-10');
    if (overlay) {
      fireEvent.click(overlay);
    }
    
    await waitFor(() => {
      expect(screen.queryByText('Sign out')).not.toBeInTheDocument();
    });
  });

  it('should call logout when sign out is clicked', async () => {
    const user = userEvent.setup();
    mockLogout.mockResolvedValue(undefined);
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      login: jest.fn(),
      register: jest.fn(),
      logout: mockLogout,
      refreshToken: jest.fn(),
    });

    render(<UserMenu />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('Sign out'));

    expect(mockLogout).toHaveBeenCalled();
  });

  it('should handle logout error gracefully', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockLogout.mockRejectedValue(new Error('Logout failed'));
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      login: jest.fn(),
      register: jest.fn(),
      logout: mockLogout,
      refreshToken: jest.fn(),
    });

    render(<UserMenu />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('Sign out'));

    expect(mockLogout).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('Logout error:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it('should close dropdown after logout', async () => {
    const user = userEvent.setup();
    mockLogout.mockResolvedValue(undefined);
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      login: jest.fn(),
      register: jest.fn(),
      logout: mockLogout,
      refreshToken: jest.fn(),
    });

    render(<UserMenu />);

    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Sign out')).toBeInTheDocument();

    await user.click(screen.getByText('Sign out'));

    await waitFor(() => {
      expect(screen.queryByText('Sign out')).not.toBeInTheDocument();
    });
  });

  it('should display correct avatar initial', () => {
    const userWithLowercaseName = {
      ...mockUser,
      username: 'john',
    };

    mockUseAuth.mockReturnValue({
      user: userWithLowercaseName,
      isLoading: false,
      isAuthenticated: true,
      login: jest.fn(),
      register: jest.fn(),
      logout: mockLogout,
      refreshToken: jest.fn(),
    });

    render(<UserMenu />);

    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('should have proper styling for avatar', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      login: jest.fn(),
      register: jest.fn(),
      logout: mockLogout,
      refreshToken: jest.fn(),
    });

    render(<UserMenu />);

    const avatar = screen.getByText('T');
    expect(avatar).toHaveClass('w-8', 'h-8', 'bg-blue-500', 'rounded-full', 'text-white');
  });

  it('should toggle dropdown on multiple clicks', async () => {
    const user = userEvent.setup();
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      login: jest.fn(),
      register: jest.fn(),
      logout: mockLogout,
      refreshToken: jest.fn(),
    });

    render(<UserMenu />);

    const menuButton = screen.getByRole('button');

    // First click - open
    await user.click(menuButton);
    expect(screen.getByText('Sign out')).toBeInTheDocument();

    // Second click - close
    await user.click(menuButton);
    await waitFor(() => {
      expect(screen.queryByText('Sign out')).not.toBeInTheDocument();
    });

    // Third click - open again
    await user.click(menuButton);
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });
});