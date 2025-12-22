import { db, User, Session } from '../database';
import { hashPassword, generateToken, verifyPassword } from '../utils/auth';

export class AuthService {
  static async isFirstTime(): Promise<boolean> {
    const userCount = await db.users.count();
    return userCount === 0;
  }

  static async register(username: string, password: string, profileImage?: string): Promise<User> {
    // Check if username already exists
    const existingUser = await db.users.where('username').equals(username).first();
    if (existingUser) {
      throw new Error('Username already exists');
    }

    const hashedPassword = hashPassword(password);
    
    const newUser: User = {
      username,
      password: hashedPassword,
      profileImage,
      createdAt: new Date()
    };

    const id = await db.users.add(newUser);
    return { ...newUser, id };
  }

  static async login(username: string, password: string): Promise<{ user: User; token: string }> {
    const user = await db.users.where('username').equals(username).first();
    
    if (!user || !verifyPassword(password, user.password)) {
      throw new Error('Invalid username or password');
    }

    // Update last login
    await db.users.update(user.id!, { lastLogin: new Date() });

    // Create session
    const token = generateToken();
    const session: Session = {
      userId: user.id!,
      token,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };

    await db.sessions.add(session);

    return { user, token };
  }

  static async getCurrentUser(token: string): Promise<User | null> {
    const session = await db.sessions.where('token').equals(token).first();
    
    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    const user = await db.users.get(session.userId);
    return user || null;
  }

  static async logout(token: string): Promise<void> {
    await db.sessions.where('token').equals(token).delete();
  }

  static async updateProfile(userId: number, profileImage: string): Promise<void> {
    await db.users.update(userId, { profileImage });
  }

  static async getStoredToken(): Promise<string | null> {
    const session = await db.sessions.orderBy('createdAt').last();
    if (!session || session.expiresAt < new Date()) {
      return null;
    }
    return session.token;
  }

  static async getAllUsers(): Promise<User[]> {
    return await db.users.orderBy('createdAt').toArray();
  }
}