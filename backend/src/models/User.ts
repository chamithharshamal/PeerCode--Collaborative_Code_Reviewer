import bcrypt from 'bcryptjs';

export interface UserData {
  id: string;
  username: string;
  email: string;
  password: string;
  avatar?: string;
  createdAt: Date;
  lastActive: Date;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  avatar?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export class User {
  public id: string;
  public username: string;
  public email: string;
  private password: string;
  public avatar?: string;
  public createdAt: Date;
  public lastActive: Date;

  constructor(data: UserData) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.password = data.password;
    this.avatar = data.avatar;
    this.createdAt = data.createdAt;
    this.lastActive = data.lastActive;
  }

  public async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  public static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  public toJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      avatar: this.avatar,
      createdAt: this.createdAt,
      lastActive: this.lastActive,
    };
  }

  public updateLastActive(): void {
    this.lastActive = new Date();
  }
}