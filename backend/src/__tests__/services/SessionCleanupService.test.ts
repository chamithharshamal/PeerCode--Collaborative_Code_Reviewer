import { SessionCleanupService } from '../../services/SessionCleanupService';
import { SessionService } from '../../services/SessionService';

// Mock SessionService
jest.mock('../../services/SessionService');
const MockedSessionService = SessionService as jest.MockedClass<typeof SessionService>;

// Mock timers
jest.useFakeTimers();

describe('SessionCleanupService', () => {
  let cleanupService: SessionCleanupService;
  let mockSessionService: jest.Mocked<SessionService>;

  beforeEach(() => {
    mockSessionService = {
      cleanupExpiredSessions: jest.fn(),
    } as any;

    cleanupService = new SessionCleanupService(mockSessionService);
  });

  afterEach(() => {
    cleanupService.stop();
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('start', () => {
    it('should start cleanup service with default interval', () => {
      mockSessionService.cleanupExpiredSessions.mockResolvedValue(2);

      cleanupService.start();

      expect(cleanupService.isRunning()).toBe(true);
      expect(mockSessionService.cleanupExpiredSessions).toHaveBeenCalledWith(60);
    });

    it('should start cleanup service with custom interval and timeout', () => {
      mockSessionService.cleanupExpiredSessions.mockResolvedValue(1);

      cleanupService.start(10000, 30);

      expect(cleanupService.isRunning()).toBe(true);
      expect(mockSessionService.cleanupExpiredSessions).toHaveBeenCalledWith(30);
    });

    it('should not start if already running', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      cleanupService.start();
      cleanupService.start(); // Try to start again

      expect(consoleSpy).toHaveBeenCalledWith('Session cleanup service is already running');
      consoleSpy.mockRestore();
    });

    it('should run periodic cleanup', async () => {
      mockSessionService.cleanupExpiredSessions.mockResolvedValue(3);

      cleanupService.start(1000, 60); // 1 second interval

      // Fast-forward time
      jest.advanceTimersByTime(1000);
      await Promise.resolve(); // Allow async operations to complete

      expect(mockSessionService.cleanupExpiredSessions).toHaveBeenCalledTimes(2); // Initial + periodic
    });

    it('should handle cleanup errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockSessionService.cleanupExpiredSessions.mockRejectedValue(new Error('Cleanup failed'));

      cleanupService.start(1000, 60);

      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      expect(consoleSpy).toHaveBeenCalledWith('Error during scheduled session cleanup:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('stop', () => {
    it('should stop cleanup service', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      cleanupService.start();
      expect(cleanupService.isRunning()).toBe(true);

      cleanupService.stop();
      expect(cleanupService.isRunning()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Session cleanup service stopped');
      
      consoleSpy.mockRestore();
    });

    it('should do nothing if not running', () => {
      expect(cleanupService.isRunning()).toBe(false);
      cleanupService.stop();
      expect(cleanupService.isRunning()).toBe(false);
    });
  });

  describe('runCleanup', () => {
    it('should run manual cleanup successfully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockSessionService.cleanupExpiredSessions.mockResolvedValue(5);

      const result = await cleanupService.runCleanup(30);

      expect(result).toBe(5);
      expect(mockSessionService.cleanupExpiredSessions).toHaveBeenCalledWith(30);
      expect(consoleSpy).toHaveBeenCalledWith('Running session cleanup...');
      expect(consoleSpy).toHaveBeenCalledWith('Session cleanup completed: 5 sessions cleaned');
      
      consoleSpy.mockRestore();
    });

    it('should handle manual cleanup errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockSessionService.cleanupExpiredSessions.mockRejectedValue(new Error('Manual cleanup failed'));

      const result = await cleanupService.runCleanup();

      expect(result).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith('Error during manual session cleanup:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('isRunning', () => {
    it('should return false initially', () => {
      expect(cleanupService.isRunning()).toBe(false);
    });

    it('should return true when running', () => {
      cleanupService.start();
      expect(cleanupService.isRunning()).toBe(true);
    });

    it('should return false after stopping', () => {
      cleanupService.start();
      cleanupService.stop();
      expect(cleanupService.isRunning()).toBe(false);
    });
  });
});