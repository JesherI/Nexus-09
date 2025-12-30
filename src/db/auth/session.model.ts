import { TokenType } from '../types/enums';

export interface Session {
  id?: string;
  userId: string;
  deviceId: string;
  deviceFingerprint: string;
  // Tokens removed for security - stored encrypted separately
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  isActive: boolean;
  invalidatedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface JWTPayload {
  userId: string;
  deviceId: string;
  sessionId: string;
  businessId?: string;
  type: TokenType;
  iat: number;
  exp: number;
}