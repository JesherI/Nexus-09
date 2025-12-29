import { auth, db as firestore } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';

export interface BusinessData {
  id: string;
  name: string;
  location: string;
  website?: string;
  email?: string;
  phone: string;
  logo?: string;
  createdAt: Date;
  ownerIds: string[]; // Array of owner UIDs
  adminIds: string[]; // Array of admin UIDs
  cashierIds: string[]; // Array of cashier UIDs
  subscriptionId?: string; // Reference to subscription
}

export interface OwnerData {
  uid?: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  phone: string;
  email: string;
  profileImage?: string;
  businessId: string;
  createdAt: Date;
}

export interface UserData {
  uid?: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  phone: string;
  email: string;
  profileImage?: string;
  type: string; // 'owner' | 'admin' | 'cashier'
  businessId: string;
  createdAt: Date;
  lastLogin?: Date;
}

export type SubscriptionPlan = 'core' | 'business' | 'intelligence' | 'lab';

export interface Subscription {
  id?: string;
  businessId: string;
  plan: SubscriptionPlan;
  status: 'active' | 'inactive' | 'cancelled';
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class FirebaseServices {
  // Check if business already exists
  static async checkBusinessExists(name: string, phone: string, email?: string): Promise<BusinessData | null> {
    try {
      // Check by name
      const nameQuery = query(collection(firestore, 'businesses'), where('name', '==', name));
      const nameSnapshot = await getDocs(nameQuery);
      if (!nameSnapshot.empty) {
        return nameSnapshot.docs[0].data() as BusinessData;
      }

      // Check by phone
      const phoneQuery = query(collection(firestore, 'businesses'), where('phone', '==', phone));
      const phoneSnapshot = await getDocs(phoneQuery);
      if (!phoneSnapshot.empty) {
        return phoneSnapshot.docs[0].data() as BusinessData;
      }

      // Check by email if provided
      if (email) {
        const emailQuery = query(collection(firestore, 'businesses'), where('email', '==', email));
        const emailSnapshot = await getDocs(emailQuery);
        if (!emailSnapshot.empty) {
          return emailSnapshot.docs[0].data() as BusinessData;
        }
      }

      return null;
    } catch (error) {
      console.error('Error checking business existence:', error);
      throw new Error('Failed to check business existence');
    }
  }

  // Business registration
  static async registerBusiness(businessData: {
    name: string;
    location: string;
    website?: string;
    email?: string;
    phone: string;
    logo?: string;
    createdAt: Date;
  }): Promise<{ id: string; isExisting: boolean }> {
    try {
      // Check if business already exists
      const existingBusiness = await this.checkBusinessExists(businessData.name, businessData.phone, businessData.email);
      if (existingBusiness) {
        // Return existing business ID without saving
        return { id: existingBusiness.id!, isExisting: true };
      }

      const businessRef = doc(collection(firestore, 'businesses'));
       const businessWithId = {
         ...businessData,
         id: businessRef.id,
         ownerIds: [], // Initialize empty array
         adminIds: [],
         cashierIds: []
       };

      // Filter out undefined values for Firestore
      const filteredBusiness: any = {};
      Object.keys(businessWithId).forEach(key => {
        if (businessWithId[key as keyof typeof businessWithId] !== undefined) {
          filteredBusiness[key] = businessWithId[key as keyof typeof businessWithId];
        }
      });

      await setDoc(businessRef, filteredBusiness);
      return { id: businessRef.id, isExisting: false };
    } catch (error) {
      console.error('Error registering business:', error);
      throw new Error('Failed to register business');
    }
  }

  // Owner registration
  static async registerOwner(ownerData: OwnerData, password: string): Promise<{ user: FirebaseUser; businessId: string }> {
    try {
      // Check if email already exists
      const emailQuery = query(collection(firestore, 'owners'), where('email', '==', ownerData.email));
      const emailSnapshot = await getDocs(emailQuery);
      if (!emailSnapshot.empty) {
        throw new Error('Email already exists');
      }

      // Check if phone already exists
      const phoneQuery = query(collection(firestore, 'owners'), where('phone', '==', ownerData.phone));
      const phoneSnapshot = await getDocs(phoneQuery);
      if (!phoneSnapshot.empty) {
        throw new Error('Phone already exists');
      }

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, ownerData.email, password);
      const user = userCredential.user;

      // Save owner data to Firestore (filter out undefined values)
      const ownerRef = doc(collection(firestore, 'owners'), user.uid);
      const ownerWithUid = {
        ...ownerData,
        uid: user.uid
      };

      const filteredOwner: any = {};
      Object.keys(ownerWithUid).forEach(key => {
        if (ownerWithUid[key as keyof typeof ownerWithUid] !== undefined) {
          filteredOwner[key] = ownerWithUid[key as keyof typeof ownerWithUid];
        }
      });

      await setDoc(ownerRef, filteredOwner);

      // Add owner to business ownerIds array
      await this.addOwnerToBusiness(ownerData.businessId, user.uid);

      return { user, businessId: ownerData.businessId };
    } catch (error: any) {
      console.error('Error registering owner:', error);
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Email already exists');
      }
      if (error.code === 'auth/weak-password') {
        throw new Error('Password is too weak');
      }
      throw new Error(error.message || 'Failed to register owner');
    }
  }

  // Login with Firebase Auth - returns user and business if owner
  static async login(email: string, password: string): Promise<{ user: FirebaseUser; business?: BusinessData | null }> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if user is an owner
      const ownerData = await this.getOwner(user.uid);
      if (ownerData) {
        const business = await this.getBusiness(ownerData.businessId);
        return { user, business };
      }

      return { user };
    } catch (error: any) {
      console.error('Error logging in:', error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        throw new Error('Invalid email or password');
      }
      throw new Error(error.message || 'Failed to login');
    }
  }

  // Logout
  static async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error logging out:', error);
      throw new Error('Failed to logout');
    }
  }

  // Get business data
  static async getBusiness(businessId: string): Promise<BusinessData | null> {
    try {
      const businessDoc = await getDoc(doc(firestore, 'businesses', businessId));
      if (businessDoc.exists()) {
        return { id: businessId, ...businessDoc.data() } as BusinessData;
      }
      return null;
    } catch (error) {
      console.error('Error getting business:', error);
      throw new Error('Failed to get business data');
    }
  }

  // Get owner data
  static async getOwner(uid: string): Promise<OwnerData | null> {
    try {
      const ownerDoc = await getDoc(doc(firestore, 'owners', uid));
      if (ownerDoc.exists()) {
        return { uid, ...ownerDoc.data() } as OwnerData;
      }
      return null;
    } catch (error) {
      console.error('Error getting owner:', error);
      throw new Error('Failed to get owner data');
    }
  }

  // Add owner to business ownerIds array
  static async addOwnerToBusiness(businessId: string, ownerId: string): Promise<void> {
    try {
      const businessRef = doc(firestore, 'businesses', businessId);
      const businessDoc = await getDoc(businessRef);
      if (businessDoc.exists()) {
        const currentOwnerIds = businessDoc.data()?.ownerIds || [];
        if (!currentOwnerIds.includes(ownerId)) {
          await updateDoc(businessRef, {
            ownerIds: [...currentOwnerIds, ownerId]
          });
        }
      }
    } catch (error) {
      console.error('Error adding owner to business:', error);
      throw new Error('Failed to add owner to business');
    }
  }

  // Add admin to business adminIds array
  static async addAdminToBusiness(businessId: string, adminId: string): Promise<void> {
    try {
      const businessRef = doc(firestore, 'businesses', businessId);
      const businessDoc = await getDoc(businessRef);
      if (businessDoc.exists()) {
        const currentAdminIds = businessDoc.data()?.adminIds || [];
        if (!currentAdminIds.includes(adminId)) {
          await updateDoc(businessRef, {
            adminIds: [...currentAdminIds, adminId]
          });
        }
      }
    } catch (error) {
      console.error('Error adding admin to business:', error);
      throw new Error('Failed to add admin to business');
    }
  }

  // Add cashier to business cashierIds array
  static async addCashierToBusiness(businessId: string, cashierId: string): Promise<void> {
    try {
      const businessRef = doc(firestore, 'businesses', businessId);
      const businessDoc = await getDoc(businessRef);
      if (businessDoc.exists()) {
        const currentCashierIds = businessDoc.data()?.cashierIds || [];
        if (!currentCashierIds.includes(cashierId)) {
          await updateDoc(businessRef, {
            cashierIds: [...currentCashierIds, cashierId]
          });
        }
      }
    } catch (error) {
      console.error('Error adding cashier to business:', error);
      throw new Error('Failed to add cashier to business');
    }
  }

  // Check if user is owner of business
  static async isOwnerOfBusiness(uid: string, businessId: string): Promise<boolean> {
    try {
      const businessDoc = await getDoc(doc(firestore, 'businesses', businessId));
      if (businessDoc.exists()) {
        const ownerIds = businessDoc.data()?.ownerIds || [];
        return ownerIds.includes(uid);
      }
      return false;
    } catch (error) {
      console.error('Error checking owner status:', error);
      return false;
    }
  }

  // Get all owners of a business
  static async getBusinessOwners(businessId: string): Promise<OwnerData[]> {
    try {
      const businessDoc = await getDoc(doc(firestore, 'businesses', businessId));
      if (businessDoc.exists()) {
        const ownerIds = businessDoc.data()?.ownerIds || [];
        const owners: OwnerData[] = [];
        for (const ownerId of ownerIds) {
          const ownerData = await this.getOwner(ownerId);
          if (ownerData) {
            owners.push(ownerData);
          }
        }
        return owners;
      }
      return [];
    } catch (error) {
      console.error('Error getting business owners:', error);
      throw new Error('Failed to get business owners');
    }
  }

  // Register any user in Firebase Auth and Firestore
  static async registerUser(userData: UserData, password: string): Promise<{ user: FirebaseUser }> {
    try {
      // Check if business exists
      const businessExists = await this.getBusiness(userData.businessId);
      if (!businessExists) {
        throw new Error('Business does not exist');
      }

      // Check if email already exists
      const emailQuery = query(collection(firestore, 'users'), where('email', '==', userData.email));
      const emailSnapshot = await getDocs(emailQuery);
      if (!emailSnapshot.empty) {
        throw new Error('Email already exists');
      }

      // Check if phone already exists
      const phoneQuery = query(collection(firestore, 'users'), where('phone', '==', userData.phone));
      const phoneSnapshot = await getDocs(phoneQuery);
      if (!phoneSnapshot.empty) {
        throw new Error('Phone already exists');
      }

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, password);
      const user = userCredential.user;

      // Save user data to Firestore (filter out undefined values)
      const userRef = doc(collection(firestore, 'users'), user.uid);
      const userWithUid = {
        ...userData,
        uid: user.uid
      };

      const filteredUser: any = {};
      Object.keys(userWithUid).forEach(key => {
        if (userWithUid[key as keyof typeof userWithUid] !== undefined) {
          filteredUser[key] = userWithUid[key as keyof typeof userWithUid];
        }
      });

      await setDoc(userRef, filteredUser);

       // Add user to appropriate business arrays
       if (userData.type === 'owner') {
         const ownerRef = doc(collection(firestore, 'owners'), user.uid);
         await setDoc(ownerRef, filteredUser);
         await this.addOwnerToBusiness(userData.businessId, user.uid);
       } else if (userData.type === 'admin') {
         await this.addAdminToBusiness(userData.businessId, user.uid);
       } else if (userData.type === 'cashier') {
         await this.addCashierToBusiness(userData.businessId, user.uid);
       }

      return { user };
    } catch (error: any) {
      console.error('Error registering user:', error);
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Email already exists');
      }
      if (error.code === 'auth/weak-password') {
        throw new Error('Password is too weak');
      }
      throw new Error(error.message || 'Failed to register user');
    }
  }

  // Login with Firebase Auth - returns user and business if owner
  static async loginUser(email: string, password: string): Promise<{ user: FirebaseUser; userData?: UserData; business?: BusinessData | null }> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get user data from Firestore
      const userData = await this.getUser(user.uid);
      if (userData) {
        // Update last login
        await updateDoc(doc(firestore, 'users', user.uid), {
          lastLogin: new Date()
        });

        if (userData.type === 'owner') {
          const business = await this.getBusiness(userData.businessId);
          return { user, userData, business };
        }
        return { user, userData };
      }

      return { user };
    } catch (error: any) {
      console.error('Error logging in:', error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        throw new Error('Invalid email or password');
      }
      throw new Error(error.message || 'Failed to login');
    }
  }

  // Get user data
  static async getUser(uid: string): Promise<UserData | null> {
    try {
      const userDoc = await getDoc(doc(firestore, 'users', uid));
      if (userDoc.exists()) {
        return { uid, ...userDoc.data() } as UserData;
      }
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      throw new Error('Failed to get user data');
    }
  }

  // Get all users of a business
  static async getBusinessUsers(businessId: string): Promise<UserData[]> {
    try {
      const usersQuery = query(collection(firestore, 'users'), where('businessId', '==', businessId));
      const usersSnapshot = await getDocs(usersQuery);
      const users: UserData[] = [];
      usersSnapshot.forEach(doc => {
        users.push({ uid: doc.id, ...doc.data() } as UserData);
      });
      return users;
    } catch (error) {
      console.error('Error getting business users:', error);
      throw new Error('Failed to get business users');
    }
  }

  // Create a subscription for a business
  static async createSubscription(subscriptionData: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const subscriptionRef = doc(collection(firestore, 'subscriptions'));
      const subscriptionWithId = {
        ...subscriptionData,
        id: subscriptionRef.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const filteredSubscription: any = {};
      Object.keys(subscriptionWithId).forEach(key => {
        if (subscriptionWithId[key as keyof typeof subscriptionWithId] !== undefined) {
          filteredSubscription[key] = subscriptionWithId[key as keyof typeof subscriptionWithId];
        }
      });

      await setDoc(subscriptionRef, filteredSubscription);

      // Update business with subscription ID
      await this.linkSubscriptionToBusiness(subscriptionData.businessId, subscriptionRef.id);

      return subscriptionRef.id;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw new Error('Failed to create subscription');
    }
  }

  // Get subscription by business ID
  static async getSubscriptionByBusinessId(businessId: string): Promise<Subscription | null> {
    try {
      const subscriptionQuery = query(collection(firestore, 'subscriptions'), where('businessId', '==', businessId));
      const subscriptionSnapshot = await getDocs(subscriptionQuery);
      if (!subscriptionSnapshot.empty) {
        const doc = subscriptionSnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Subscription;
      }
      return null;
    } catch (error) {
      console.error('Error getting subscription:', error);
      throw new Error('Failed to get subscription');
    }
  }

  // Update subscription
  static async updateSubscription(subscriptionId: string, updates: Partial<Omit<Subscription, 'id' | 'businessId' | 'createdAt'>>): Promise<void> {
    try {
      const subscriptionRef = doc(firestore, 'subscriptions', subscriptionId);
      await updateDoc(subscriptionRef, {
        ...updates,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw new Error('Failed to update subscription');
    }
  }

  // Link subscription to business
  static async linkSubscriptionToBusiness(businessId: string, subscriptionId: string): Promise<void> {
    try {
      const businessRef = doc(firestore, 'businesses', businessId);
      await updateDoc(businessRef, {
        subscriptionId: subscriptionId
      });
    } catch (error) {
      console.error('Error linking subscription to business:', error);
      throw new Error('Failed to link subscription to business');
    }
  }
}