import { User, UserData, CreateUserData, LoginCredentials } from '../models/User';
import { v4 as uuidv4 } from 'uuid';

// In-memory storage for users (will be replaced with database in future tasks)
class UserStorage {
  private users: Map<string, User> = new Map();
  private emailIndex: Map<string, string> = new Map(); // email -> userId
  private usernameIndex: Map<string, string> = new Map(); // username -> userId

  async create(userData: CreateUserData): Promise<User> {
    // Check if email already exists
    if (this.emailIndex.has(userData.email.toLowerCase())) {
      throw new Error('Email already exists');
    }

    // Check if username already exists
    if (this.usernameIndex.has(userData.username.toLowerCase())) {
      throw new Error('Username already exists');
    }

    const userId = uuidv4();
    const hashedPassword = await User.hashPassword(userData.password);
    const now = new Date();

    const user = new User({
      id: userId,
      username: userData.username,
      email: userData.email.toLowerCase(),
      password: hashedPassword,
      avatar: userData.avatar,
      createdAt: now,
      lastActive: now,
    });

    this.users.set(userId, user);
    this.emailIndex.set(userData.email.toLowerCase(), userId);
    this.usernameIndex.set(userData.username.toLowerCase(), userId);

    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const userId = this.emailIndex.get(email.toLowerCase());
    return userId ? this.users.get(userId) || null : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const userId = this.usernameIndex.get(username.toLowerCase());
    return userId ? this.users.get(userId) || null : null;
  }

  async updateLastActive(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.updateLastActive();
    }
  }

  async delete(userId: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) {
      return false;
    }

    this.users.delete(userId);
    this.emailIndex.delete(user.email);
    this.usernameIndex.delete(user.username.toLowerCase());
    return true;
  }

  // For testing purposes
  clear(): void {
    this.users.clear();
    this.emailIndex.clear();
    this.usernameIndex.clear();
  }

  size(): number {
    return this.users.size;
  }
}

export class UserService {
  private storage = new UserStorage();

  async register(userData: CreateUserData): Promise<User> {
    // Validate input
    this.validateRegistrationData(userData);

    try {
      return await this.storage.create(userData);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create user');
    }
  }

  async login(credentials: LoginCredentials): Promise<User> {
    const user = await this.storage.findByEmail(credentials.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isValidPassword = await user.validatePassword(credentials.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update last active timestamp
    await this.storage.updateLastActive(user.id);

    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.storage.findById(id);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.storage.findByEmail(email);
  }

  async updateLastActive(userId: string): Promise<void> {
    await this.storage.updateLastActive(userId);
  }

  private validateRegistrationData(userData: CreateUserData): void {
    if (!userData.username || userData.username.trim().length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }

    if (!userData.email || !this.isValidEmail(userData.email)) {
      throw new Error('Valid email is required');
    }

    if (!userData.password || userData.password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Check for valid username format (alphanumeric and underscores only)
    if (!/^[a-zA-Z0-9_]+$/.test(userData.username)) {
      throw new Error('Username can only contain letters, numbers, and underscores');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // For testing purposes
  clearStorage(): void {
    this.storage.clear();
  }

  getStorageSize(): number {
    return this.storage.size();
  }
}

// Export singleton instance
export const userService = new UserService();