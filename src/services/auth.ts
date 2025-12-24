import { db, User, Session, UserType } from '../database';
import { hashPassword, generateToken, verifyPassword } from '../utils/auth';

export class AuthService {
  static async isFirstTime(): Promise<boolean> {
    const userCount = await db.users.count();
    return userCount === 0;
  }

static async register(userData: {
    nombre: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    phone: string;
    email: string;
    password: string;
    profileImage?: string;
    type?: UserType; // Make optional - will be determined automatically
  }): Promise<User> {
    // Check if email already exists
    const existingUser = await db.users.where('email').equals(userData.email).first();
    if (existingUser) {
      throw new Error('Email already exists');
    }

    // Check if phone already exists
    const existingPhone = await db.users.where('phone').equals(userData.phone).first();
    if (existingPhone) {
      throw new Error('Phone already exists');
    }

    // Determine user type automatically
    const isFirstTime = await this.isFirstTime();
    let userType: UserType;
    
    if (isFirstTime) {
      // First user is always owner
      userType = 'owner';
    } else {
      // Subsequent users cannot be owner
      if (userData.type === 'owner') {
        throw new Error('Only the first user can be owner');
      }
      userType = userData.type || 'admin'; // Default to admin if not specified
    }

    const hashedPassword = hashPassword(userData.password);
    
    const newUser: User = {
      nombre: userData.nombre,
      apellidoPaterno: userData.apellidoPaterno,
      apellidoMaterno: userData.apellidoMaterno,
      phone: userData.phone,
      email: userData.email,
      password: hashedPassword,
      profileImage: userData.profileImage,
      type: userType,
      createdAt: new Date()
    };

    const id = await db.users.add(newUser);
    return { ...newUser, id };
  }

static async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const user = await db.users.where('email').equals(email).first();
    
    if (!user || !verifyPassword(password, user.password)) {
      throw new Error('Invalid email or password');
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