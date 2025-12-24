import Dexie, { Table } from 'dexie';

export type UserType = 'owner' | 'admin' | 'cashier';

export interface User {
  id?: number;
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
  id?: number;
  userId: number;
  token: string;
  createdAt: Date;
  expiresAt: Date;
}

class AppDatabase extends Dexie {
  users!: Table<User>;
  sessions!: Table<Session>;

  constructor() {
    super('NexusAppDB');
    
this.version(1).stores({
      users: '++id, email, phone, type, createdAt, lastLogin',
      sessions: '++id, userId, token, createdAt, expiresAt'
    });
  }
}

export const db = new AppDatabase();