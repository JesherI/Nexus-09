import { db, User, UserType } from '../database';
import { hashPassword, verifyPassword } from '../utils/auth';
import { FirebaseServices } from './firebaseServices';

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
      profileImage: userData.profileImage,
      type: userType,
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

 static async login(email: string, password: string): Promise<{ user: User }> {
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
          profileImage: userData.profileImage,
          type: userData.type as UserType,
          createdAt: userData.createdAt,
          lastLogin: userData.lastLogin
        };

        // Update local DB if user exists, or add if not
        const existingLocalUser = await db.users.where('email').equals(email).first();
        if (existingLocalUser) {
          await db.users.update(existingLocalUser.id!, {
            lastLogin: new Date(),
            profileImage: userData.profileImage
          });
          localUser.id = existingLocalUser.id;
        } else {
          const id = await db.users.add({
            ...localUser,
            password: hashPassword(password) // Store hashed password for offline login
          });
          localUser.id = id;
        }

        return { user: localUser };
      }
    } catch (firebaseError) {
      console.error('Firebase login failed:', firebaseError);
      // Fall back to local login
    }

    // Local login fallback
    const user = await db.users.where('email').equals(email).first();

    if (!user || !verifyPassword(password, user.password)) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await db.users.update(user.id!, { lastLogin: new Date() });

    return { user };
  }

 static async getCurrentUser(): Promise<User | null> {
    const storedToken = await this.getStoredToken();
    if (storedToken) {
      try {
        // Parse stored user data
        const userData = JSON.parse(storedToken);
        // Verify user still exists in local DB
        const user = await db.users.get(userData.id);
        if (user) {
          return user;
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    }
    return null;
  }

static async logout(): Promise<void> {
    // Limpiar todas las sesiones activas
    await db.sessions.clear();
  }

  static async updateProfile(userId: string, profileImage: string): Promise<void> {
    await db.users.update(userId, { profileImage });
  }

static async getStoredToken(): Promise<string | null> {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken');
    }
    return null;
  }

 static async storeToken(userData: User): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', JSON.stringify(userData));
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
              profileImage: userData.profileImage,
              type: userData.type as UserType,
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