import { SessionService } from './SessionService';

export class SessionCleanupService {
  private sessionService: SessionService;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly DEFAULT_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly DEFAULT_SESSION_TIMEOUT = 60; // 60 minutes

  constructor(sessionService: SessionService = new SessionService()) {
    this.sessionService = sessionService;
  }

  start(
    intervalMs: number = this.DEFAULT_CLEANUP_INTERVAL,
    sessionTimeoutMinutes: number = this.DEFAULT_SESSION_TIMEOUT
  ): void {
    if (this.cleanupInterval) {
      console.log('Session cleanup service is already running');
      return;
    }

    console.log(`Starting session cleanup service with ${intervalMs}ms interval`);
    
    this.cleanupInterval = setInterval(async () => {
      try {
        const cleanedCount = await this.sessionService.cleanupExpiredSessions(sessionTimeoutMinutes);
        if (cleanedCount > 0) {
          console.log(`Session cleanup completed: ${cleanedCount} sessions cleaned`);
        }
      } catch (error) {
        console.error('Error during scheduled session cleanup:', error);
      }
    }, intervalMs);

    // Run initial cleanup
    this.runCleanup(sessionTimeoutMinutes);
  }

  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('Session cleanup service stopped');
    }
  }

  async runCleanup(sessionTimeoutMinutes: number = this.DEFAULT_SESSION_TIMEOUT): Promise<number> {
    try {
      console.log('Running session cleanup...');
      const cleanedCount = await this.sessionService.cleanupExpiredSessions(sessionTimeoutMinutes);
      console.log(`Session cleanup completed: ${cleanedCount} sessions cleaned`);
      return cleanedCount;
    } catch (error) {
      console.error('Error during manual session cleanup:', error);
      return 0;
    }
  }

  isRunning(): boolean {
    return this.cleanupInterval !== null;
  }
}