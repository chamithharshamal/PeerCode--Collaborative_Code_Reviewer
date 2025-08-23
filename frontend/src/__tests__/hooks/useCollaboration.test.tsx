import { renderHook } from '@testing-library/react';
import { useCollaboration } from '@/hooks/useCollaboration';

// Mock the socket hook
jest.mock('@/hooks/useSocket', () => ({
  useSocket: jest.fn(() => ({
    socket: null,
    isConnected: false,
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
}));

describe('useCollaboration', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useCollaboration('test-session'));

    expect(result.current.participants).toEqual([]);
    expect(result.current.annotations).toEqual([]);
    expect(result.current.isConnected).toBe(false);
  });
});