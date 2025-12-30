import { db, User, UserType } from '../database';
import { hashPassword, verifyPassword } from '../utils/auth';
import { FirebaseServices } from './firebaseServices';
import { SecureSessionService } from './secureSessionService';

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
    businessId?: string;
  }): Promise<User> {
    // Check if email already exists locally
    const existingUser = await db.users.where('email').equals(userData.email).first();
    if (existingUser) {
      throw new Error('Email already exists');
    }

    // Check if phone already exists locally
    const existingPhone = await db.users.where('phone').equals(userData.phone).first();
    if (existingPhone) {
      throw new Error('Phone already exists');
    }

    // Determine user type based on first time or current user's role
    const isFirstTime = await this.isFirstTime();
    let userType: UserType;
    let businessId = userData.businessId;

    if (isFirstTime) {
      // First user is always owner
      userType = 'owner';
      businessId = businessId || crypto.randomUUID();
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
      businessId: businessId,
      nombre: userData.nombre,
      apellidoPaterno: userData.apellidoPaterno,
      apellidoMaterno: userData.apellidoMaterno,
      phone: userData.phone,
      email: userData.email,
      password: hashedPassword,
      profileImageId: undefined, // Will be set after file upload
      type: userType,
      isActive: true,
      createdAt: new Date()
    };

    // Register in Firebase first
    let firebaseUserId: string | undefined;
    try {
      const firebaseUserData = {
        nombre: userData.nombre,
        apellidoPaterno: userData.apellidoPaterno,
        apellidoMaterno: userData.apellidoMaterno,
        phone: userData.phone,
        email: userData.email,
        profileImage: userData.profileImage,
        type: userType,
        businessId: businessId || '',
        createdAt: new Date()
      };
      const { user } = await FirebaseServices.registerUser(firebaseUserData, userData.password);
      firebaseUserId = user.uid;
    } catch (firebaseError) {
      console.error('Firebase registration failed:', firebaseError);
      // Continue with local registration even if Firebase fails
    }

    // Register locally
    const userId = firebaseUserId || crypto.randomUUID();
    const localUser = { ...newUser, id: userId };
    const id = await db.users.add(localUser);
    return { ...localUser, id };
  }

  static async login(email: string, password: string, deviceId?: string): Promise<{ user: User; session: any }> {
    let user: User | null = null;

    // Try Firebase login first
    try {
      const { user: firebaseUser, userData } = await FirebaseServices.loginUser(email, password);
      if (userData) {
        // Convert Firebase user data to local format
        const localUser: User = {
          id: firebaseUser.uid,
          businessId: userData.businessId,
          nombre: userData.nombre,
          apellidoPaterno: userData.apellidoPaterno,
          apellidoMaterno: userData.apellidoMaterno,
          phone: userData.phone,
          email: userData.email,
          password: '', // Not stored for Firebase users
          profileImageId: userData.profileImage, // Will be migrated to file storage later
          type: userData.type as UserType,
          isActive: true,
          createdAt: userData.createdAt,
          lastLogin: userData.lastLogin
        };

        // Update local DB if user exists, or add if not
        const existingLocalUser = await db.users.where('email').equals(email).first();
        if (existingLocalUser) {
          await db.users.update(existingLocalUser.id!, {
            lastLogin: new Date(),
            profileImageId: userData.profileImage // Will be migrated to file storage later
          });
          localUser.id = existingLocalUser.id;
        } else {
          const id = await db.users.add({
            ...localUser,
            password: hashPassword(password) // Store hashed password for offline login
          });
          localUser.id = id;
        }

        user = localUser;
      }
    } catch (firebaseError) {
      console.error('Firebase login failed:', firebaseError);
      // Fall back to local login
    }

    // Local login fallback if Firebase failed
    if (!user) {
      const localUser = await db.users.where('email').equals(email).first();

      if (!localUser || !verifyPassword(password, localUser.password)) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      await db.users.update(localUser.id!, { lastLogin: new Date() });
      user = localUser;
    }

    if (!user) {
      throw new Error('Login failed');
    }

    // Create secure session
    const session = await SecureSessionService.createSession(user, deviceId);

    // Store tokens securely
    SecureSessionService.storeTokens(session.accessToken, session.refreshToken);

    return { user, session };
  }

  static async getCurrentUser(): Promise<User | null> {
    return await SecureSessionService.getCurrentUser();
  }

  static async logout(): Promise<void> {
    await SecureSessionService.logout();
  }

  static async updateProfile(userId: string, profileImageId: string): Promise<void> {
    await db.users.update(userId, { profileImageId });
  }

  // Legacy methods - kept for backward compatibility but deprecated
  static async getStoredToken(): Promise<string | null> {
    console.warn('getStoredToken is deprecated. Use SecureSessionService instead.');
    return null;
  }

  static async storeToken(): Promise<void> {
    console.warn('storeToken is deprecated. Use SecureSessionService instead.');
  }

  static async removeStoredToken(): Promise<void> {
    console.warn('removeStoredToken is deprecated. Use SecureSessionService instead.');
  }

static async getAllUsers(): Promise<User[]> {
    return await db.users.orderBy('createdAt').toArray();
  }

  static async clearAllSessions(): Promise<void> {
    await db.sessions.clear();
  }

  // Secure session management methods
  static async refreshToken(): Promise<{ accessToken: string; refreshToken: string } | null> {
    const storedTokens = SecureSessionService.getStoredTokens();
    if (!storedTokens) return null;

    const newTokens = await SecureSessionService.refreshAccessToken(storedTokens.refreshToken);
    if (newTokens) {
      SecureSessionService.storeTokens(newTokens.accessToken, newTokens.refreshToken);
    }
    return newTokens;
  }

  static async validateSession(): Promise<boolean> {
    const session = await SecureSessionService.getCurrentSession();
    return session !== null && session.isActive;
  }

  static async checkSessionTimeout(): Promise<boolean> {
    return await SecureSessionService.checkSessionTimeout();
  }

  static async extendSession(): Promise<void> {
    await SecureSessionService.extendSession();
  }

  static async invalidateAllUserSessions(userId: string): Promise<void> {
    await SecureSessionService.invalidateAllUserSessions(userId);
  }

  static async syncFirebaseUsers(): Promise<void> {
    try {
      // Get current user from Firebase Auth state
      const { auth } = await import('../firebase');
      const currentFirebaseUser = auth.currentUser;
      if (currentFirebaseUser) {
        // Check if user exists locally
        const localUser = await db.users.where('email').equals(currentFirebaseUser.email!).first();
        if (!localUser) {
          // Get user data from Firebase
          const userData = await FirebaseServices.getUser(currentFirebaseUser.uid);
          if (userData) {
            // Add to local DB
            await db.users.add({
              id: currentFirebaseUser.uid,
              businessId: userData.businessId,
              nombre: userData.nombre,
              apellidoPaterno: userData.apellidoPaterno,
              apellidoMaterno: userData.apellidoMaterno,
              phone: userData.phone,
              email: userData.email,
              password: '', // Firebase users don't store password locally
              profileImageId: userData.profileImage, // Will be migrated to file storage later
              type: userData.type as UserType,
              isActive: true,
              createdAt: userData.createdAt,
              lastLogin: userData.lastLogin
            });
          }
        }
      }
    } catch (error) {
      console.error('Error syncing Firebase users:', error);
    }
  }
}