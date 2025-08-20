import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthModal } from '../../../components/auth/AuthModal';
import { useAuth } from '../../../lib/auth-context';

// Mock the auth context
jest.mock('../../../lib/auth-context');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('AuthModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
    });
  });

  it('should not render when isOpen is false', () => {
    render(<AuthModal isOpen={false} onClose={mockOnClose} />);

    expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
    expect(screen.queryByText('Create Account')).not.toBeInTheDocument();
  });

  it('should render login form by default when open', () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getAllByRole('heading', { name: 'Sign In' })).toHaveLength(2);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('should render register form when defaultMode is register', () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} defaultMode="register" />);

    expect(screen.getAllByRole('heading', { name: 'Create Account' })).toHaveLength(2);
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
  });

  it('should close modal when close button is clicked', async () => {
    const user = userEvent.setup();

    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    await user.click(screen.getByText('×'));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should switch from login to register mode', async () => {
    const user = userEvent.setup();

    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    // Initially shows login form
    expect(screen.getAllByRole('heading', { name: 'Sign In' })).toHaveLength(2);

    // Click switch to register
    await user.click(screen.getByText('Sign up'));

    // Should now show register form
    expect(screen.getAllByRole('heading', { name: 'Create Account' })).toHaveLength(2);
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
  });

  it('should switch from register to login mode', async () => {
    const user = userEvent.setup();

    render(<AuthModal isOpen={true} onClose={mockOnClose} defaultMode="register" />);

    // Initially shows register form
    expect(screen.getAllByRole('heading', { name: 'Create Account' })).toHaveLength(2);

    // Click switch to login
    await user.click(screen.getByText('Sign in'));

    // Should now show login form
    expect(screen.getAllByRole('heading', { name: 'Sign In' })).toHaveLength(2);
    expect(screen.queryByLabelText('Username')).not.toBeInTheDocument();
  });

  it('should close modal on successful login', async () => {
    const user = userEvent.setup();
    const mockLogin = jest.fn().mockResolvedValue(undefined);
    
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: mockLogin,
      register: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
    });

    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    // Wait for the form submission to complete
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close modal on successful registration', async () => {
    const user = userEvent.setup();
    const mockRegister = jest.fn().mockResolvedValue(undefined);
    
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: jest.fn(),
      register: mockRegister,
      logout: jest.fn(),
      refreshToken: jest.fn(),
    });

    render(<AuthModal isOpen={true} onClose={mockOnClose} defaultMode="register" />);

    await user.type(screen.getByLabelText('Username'), 'testuser');
    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText('Confirm Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    // Wait for the form submission to complete
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should have proper modal styling and structure', () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    // Check for modal backdrop
    const backdrop = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50');
    expect(backdrop).toBeInTheDocument();

    // Check for modal content
    const modal = document.querySelector('.bg-white.rounded-lg.shadow-xl');
    expect(modal).toBeInTheDocument();
  });

  it('should update modal title based on current mode', async () => {
    const user = userEvent.setup();

    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    // Initially login mode
    expect(screen.getAllByRole('heading', { name: 'Sign In' })).toHaveLength(2);

    // Switch to register
    await user.click(screen.getByText('Sign up'));
    expect(screen.getAllByRole('heading', { name: 'Create Account' })).toHaveLength(2);

    // Switch back to login
    await user.click(screen.getByText('Sign in'));
    expect(screen.getAllByRole('heading', { name: 'Sign In' })).toHaveLength(2);
  });
});