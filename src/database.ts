import Dexie, { Table } from 'dexie';

export interface User {
  id?: number;
  username: string;
  password: string; // hashed password
  profileImage?: string; // base64 image data
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
      users: '++id, username, createdAt, lastLogin',
      sessions: '++id, userId, token, createdAt, expiresAt'
    });
  }
}

export const db = new AppDatabase();