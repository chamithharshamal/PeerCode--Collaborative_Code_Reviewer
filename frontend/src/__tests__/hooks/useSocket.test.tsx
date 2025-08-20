import { renderHook, act } from '@testing-library/react';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../lib/auth-context';
import { io } from 'socket.io-client';

// Mock socket.io-client
jest.mock('socket.io-client');
const mockIo = io as jest.MockedFunction<typeof io>;

// Mock auth context
jest.mock('../../lib/auth-context');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('useSocket', () => {
  let mockSocket: any;

  beforeEach(() => {
    mockSocket = {
      connected: false,
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    };

    mockIo.mockReturnValue(mockSocket);
    
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
      },
      login: jest.fn(),
      logout: jest.fn(),
      isLoading: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize socket connection when user is available', () => {
    const { result } = renderHook(() => useSocket());

    expect(mockIo).toHaveBeenCalledWith(
      'http://localhost:5000',
      expect.objectContaining({
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        auth: {
          userId: 'user-1',
        },
      })
    );

    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should not connect when user is not available', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      login: jest.fn(),
      logout: jest.fn(),
      isLoading: false,
    });

    renderHook(() => useSocket());

    expect(mockIo).not.toHaveBeenCalled();
  });

  it('should not auto-connect when autoConnect is false', () => {
    renderHook(() => useSocket({ autoConnect: false }));

    expect(mockIo).not.toHaveBeenCalled();
  });

  it('should manually connect when connect is called', () => {
    const { result } = renderHook(() => useSocket({ autoConnect: false }));

    act(() => {
      result.current.connect();
    });

    expect(mockIo).toHaveBeenCalled();
  });

  it('should disconnect socket when disconnect is called', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      result.current.disconnect();
    });

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('should emit events when socket is connected', () => {
    mockSocket.connected = true;
    const { result } = renderHook(() => useSocket());

    act(() => {
      result.current.emit('test-event', { data: 'test' });
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
  });

  it('should not emit events when socket is not connected', () => {
    mockSocket.connected = false;
    const { result } = renderHook(() => useSocket());

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    act(() => {
      result.current.emit('test-event', { data: 'test' });
    });

    expect(mockSocket.emit).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Socket not connected, cannot emit event:',
      'test-event'
    );

    consoleSpy.mockRestore();
  });

  it('should register event listeners', () => {
    const { result } = renderHook(() => useSocket());
    const callback = jest.fn();

    act(() => {
      result.current.on('test-event', callback);
    });

    expect(mockSocket.on).toHaveBeenCalledWith('test-event', callback);
  });

  it('should unregister event listeners', () => {
    const { result } = renderHook(() => useSocket());
    const callback = jest.fn();

    act(() => {
      result.current.off('test-event', callback);
    });

    expect(mockSocket.off).toHaveBeenCalledWith('test-event', callback);
  });

  it('should unregister all listeners for an event when no callback provided', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      result.current.off('test-event');
    });

    expect(mockSocket.off).toHaveBeenCalledWith('test-event');
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useSocket());

    unmount();

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('should use custom socket options', () => {
    renderHook(() =>
      useSocket({
        reconnection: false,
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
      })
    );

    expect(mockIo).toHaveBeenCalledWith(
      'http://localhost:5000',
      expect.objectContaining({
        reconnection: false,
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
      })
    );
  });
});