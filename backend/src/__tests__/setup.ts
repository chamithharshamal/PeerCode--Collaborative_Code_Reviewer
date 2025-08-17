// Test setup file
import { userService } from '../services/UserService';

// Clear user storage before each test
beforeEach(() => {
  userService.clearStorage();
});

// Dummy test to prevent "no tests" error
describe('Setup', () => {
  it('should clear storage before each test', () => {
    expect(userService.getStorageSize()).toBe(0);
  });
});