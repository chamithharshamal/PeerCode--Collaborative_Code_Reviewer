import { User } from '../../models/User';

describe('User Model', () => {
  const mockUserData = {
    id: '123',
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedpassword',
    createdAt: new Date(),
    lastActive: new Date(),
  };

  describe('constructor', () => {
    it('should create a user instance with provided data', () => {
      const user = new User(mockUserData);
      
      expect(user.id).toBe(mockUserData.id);
      expect(user.username).toBe(mockUserData.username);
      expect(user.email).toBe(mockUserData.email);
      expect(user.createdAt).toBe(mockUserData.createdAt);
      expect(user.lastActive).toBe(mockUserData.lastActive);
    });
  });

  describe('validatePassword', () => {
    it('should return true for correct password', async () => {
      const plainPassword = 'testpassword';
      const hashedPassword = await User.hashPassword(plainPassword);
      
      const user = new User({
        ...mockUserData,
        password: hashedPassword,
      });

      const isValid = await user.validatePassword(plainPassword);
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const plainPassword = 'testpassword';
      const wrongPassword = 'wrongpassword';
      const hashedPassword = await User.hashPassword(plainPassword);
      
      const user = new User({
        ...mockUserData,
        password: hashedPassword,
      });

      const isValid = await user.validatePassword(wrongPassword);
      expect(isValid).toBe(false);
    });
  });

  describe('hashPassword', () => {
    it('should hash password correctly', async () => {
      const plainPassword = 'testpassword';
      const hashedPassword = await User.hashPassword(plainPassword);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(plainPassword);
      expect(hashedPassword.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for same password', async () => {
      const plainPassword = 'testpassword';
      const hash1 = await User.hashPassword(plainPassword);
      const hash2 = await User.hashPassword(plainPassword);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('toJSON', () => {
    it('should return user data without password', () => {
      const user = new User(mockUserData);
      const json = user.toJSON();
      
      expect(json).toEqual({
        id: mockUserData.id,
        username: mockUserData.username,
        email: mockUserData.email,
        avatar: undefined,
        createdAt: mockUserData.createdAt,
        lastActive: mockUserData.lastActive,
      });
      expect(json).not.toHaveProperty('password');
    });
  });

  describe('updateLastActive', () => {
    it('should update lastActive timestamp', () => {
      const user = new User(mockUserData);
      const originalLastActive = user.lastActive;
      
      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        user.updateLastActive();
        expect(user.lastActive.getTime()).toBeGreaterThan(originalLastActive.getTime());
      }, 10);
    });
  });
});