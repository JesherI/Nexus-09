import Dexie, { Table } from 'dexie';

export type UserType = 'owner' | 'admin' | 'cashier';

export interface Business {
  id?: string;
  name: string;
  logo?: string; // base64 image data
  location: string;
  website?: string;
  email?: string;
  phone: string;
  createdAt: Date;
}

export interface User {
  id?: string;
  businessId?: string; // reference to business
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  phone: string;
  email: string;
  password: string; // hashed password
  profileImage?: string; // base64 image data
  type: UserType;
  createdAt: Date;
  lastLogin?: Date;
}

export interface Session {
  id?: string;
  userId: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface PosSettings {
  id?: number;
  businessId: string;
  timezone: string;
  dateFormat: string;
  currency: string;
  createdAt: Date;
}

class AppDatabase extends Dexie {
  users!: Table<User>;
  businesses!: Table<Business>;
  sessions!: Table<Session>;
  posSettings!: Table<PosSettings>;

  constructor() {
    super('NexusAppDB');

    this.version(3).stores({
      users: 'id, email, phone, type, createdAt, lastLogin',
      businesses: 'id, name, location, phone, createdAt',
      sessions: 'id, userId, token, createdAt, expiresAt',
      posSettings: '++id, businessId, timezone, dateFormat, currency, createdAt'
    });
  }
}

export const db = new AppDatabase();