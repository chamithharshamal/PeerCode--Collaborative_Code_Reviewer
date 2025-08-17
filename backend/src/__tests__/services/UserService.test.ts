import { UserService } from '../../services/UserService';
import { CreateUserData, LoginCredentials } from '../../models/User';

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
  });

  describe('register', () => {
    const validUserData: CreateUserData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    };

    it('should register a new user successfully', async () => {
      const user = await userService.register(validUserData);
      
      expect(user.username).toBe(validUserData.username);
      expect(user.email).toBe(validUserData.email.toLowerCase());
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeDefined();
      expect(user.lastActive).toBeDefined();
    });

    it('should throw error for duplicate email', async () => {
      await userService.register(validUserData);
      
      await expect(userService.register(validUserData)).rejects.toThrow('Email already exists');
    });

    it('should throw error for duplicate username', async () => {
      await userService.register(validUserData);
      
      const duplicateUsername = {
        ...validUserData,
        email: 'different@example.com',
      };
      
      await expect(userService.register(duplicateUsername)).rejects.toThrow('Username already exists');
    });

    it('should throw error for invalid email', async () => {
      const invalidEmailData = {
        ...validUserData,
        email: 'invalid-email',
      };
      
      await expect(userService.register(invalidEmailData)).rejects.toThrow('Valid email is required');
    });

    it('should throw error for short username', async () => {
      const shortUsernameData = {
        ...validUserData,
        username: 'ab',
      };
      
      await expect(userService.register(shortUsernameData)).rejects.toThrow('Username must be at least 3 characters long');
    });

    it('should throw error for short password', async () => {
      const shortPasswordData = {
        ...validUserData,
        password: '123',
      };
      
      await expect(userService.register(shortPasswordData)).rejects.toThrow('Password must be at least 6 characters long');
    });

    it('should throw error for invalid username characters', async () => {
      const invalidUsernameData = {
        ...validUserData,
        username: 'test@user',
      };
      
      await expect(userService.register(invalidUsernameData)).rejects.toThrow('Username can only contain letters, numbers, and underscores');
    });
  });

  describe('login', () => {
    const userData: CreateUserData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    };

    beforeEach(async () => {
      await userService.register(userData);
    });

    it('should login with valid credentials', async () => {
      const credentials: LoginCredentials = {
        email: userData.email,
        password: userData.password,
      };
      
      const user = await userService.login(credentials);
      expect(user.email).toBe(userData.email.toLowerCase());
      expect(user.username).toBe(userData.username);
    });

    it('should throw error for non-existent email', async () => {
      const credentials: LoginCredentials = {
        email: 'nonexistent@example.com',
        password: userData.password,
      };
      
      await expect(userService.login(credentials)).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for wrong password', async () => {
      const credentials: LoginCredentials = {
        email: userData.email,
        password: 'wrongpassword',
      };
      
      await expect(userService.login(credentials)).rejects.toThrow('Invalid email or password');
    });

    it('should be case insensitive for email', async () => {
      const credentials: LoginCredentials = {
        email: userData.email.toUpperCase(),
        password: userData.password,
      };
      
      const user = await userService.login(credentials);
      expect(user.email).toBe(userData.email.toLowerCase());
    });
  });

  describe('getUserById', () => {
    it('should return user for valid ID', async () => {
      const registeredUser = await userService.register({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });
      
      const foundUser = await userService.getUserById(registeredUser.id);
      expect(foundUser).toBeDefined();
      expect(foundUser!.id).toBe(registeredUser.id);
    });

    it('should return null for non-existent ID', async () => {
      const foundUser = await userService.getUserById('non-existent-id');
      expect(foundUser).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user for valid email', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };
      
      await userService.register(userData);
      
      const foundUser = await userService.getUserByEmail(userData.email);
      expect(foundUser).toBeDefined();
      expect(foundUser!.email).toBe(userData.email.toLowerCase());
    });

    it('should return null for non-existent email', async () => {
      const foundUser = await userService.getUserByEmail('nonexistent@example.com');
      expect(foundUser).toBeNull();
    });

    it('should be case insensitive', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };
      
      await userService.register(userData);
      
      const foundUser = await userService.getUserByEmail(userData.email.toUpperCase());
      expect(foundUser).toBeDefined();
      expect(foundUser!.email).toBe(userData.email.toLowerCase());
    });
  });

  describe('updateLastActive', () => {
    it('should update last active timestamp', async () => {
      const user = await userService.register({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });
      
      const originalLastActive = user.lastActive;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await userService.updateLastActive(user.id);
      
      const updatedUser = await userService.getUserById(user.id);
      expect(updatedUser!.lastActive.getTime()).toBeGreaterThan(originalLastActive.getTime());
    });
  });
});