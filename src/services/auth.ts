import { db, User, UserType } from '../database';
import { hashPassword, verifyPassword } from '../utils/auth';

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
    currentUserRole?: UserType; // Role of the current user making the registration
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

    // Determine user type based on first time or current user's role
    const isFirstTime = await this.isFirstTime();
    let userType: UserType;
    
    if (isFirstTime) {
      // First user is always owner
      userType = 'owner';
    } else {
      // Validate role-based registration
      if (!userData.currentUserRole) {
        throw new Error('Current user role is required for registration');
      }

      if (userData.currentUserRole === 'owner') {
        // Owner can register admins
        if (userData.type && userData.type !== 'admin') {
          throw new Error('Owner can only register admin users');
        }
        userType = 'admin';
      } else if (userData.currentUserRole === 'admin') {
        // Admin can register cashiers
        if (userData.type && userData.type !== 'cashier') {
          throw new Error('Admin can only register cashier users');
        }
        userType = 'cashier';
      } else {
        throw new Error('Cashier cannot register new users');
      }
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

static async login(email: string, password: string): Promise<{ user: User }> {
    const user = await db.users.where('email').equals(email).first();
    
    if (!user || !verifyPassword(password, user.password)) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await db.users.update(user.id!, { lastLogin: new Date() });

    return { user };
  }

static async getCurrentUser(): Promise<User | null> {
    // Ya no hay persistencia de sesión, siempre retorna null
    return null;
  }

static async logout(): Promise<void> {
    // Limpiar todas las sesiones activas
    await db.sessions.clear();
  }

  static async updateProfile(userId: number, profileImage: string): Promise<void> {
    await db.users.update(userId, { profileImage });
  }

static async getStoredToken(): Promise<string | null> {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken');
    }
    return null;
  }

  static async storeToken(token: string): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
    }
  }

  static async removeStoredToken(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
  }

static async getAllUsers(): Promise<User[]> {
    return await db.users.orderBy('createdAt').toArray();
  }

  static async clearAllSessions(): Promise<void> {
    await db.sessions.clear();
  }
}