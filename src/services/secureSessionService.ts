import { db, Session, User, JWTPayload } from '../database';
import { createJWT, verifyJWT, getDeviceFingerprint, generateDeviceId } from '../utils/auth';

export class SecureSessionService {
  private static readonly ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes
  private static readonly REFRESH_TOKEN_EXPIRY = 8 * 60 * 60 * 1000; // 8 hours
  private static readonly SHIFT_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours
  private static readonly INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  static async createSession(user: User, deviceId?: string): Promise<Session> {
    const sessionId = crypto.randomUUID();
    const actualDeviceId = deviceId || generateDeviceId();
    const deviceFingerprint = getDeviceFingerprint();

    const now = new Date();
    const accessExpiry = new Date(now.getTime() + this.ACCESS_TOKEN_EXPIRY);
    const refreshExpiry = new Date(now.getTime() + this.REFRESH_TOKEN_EXPIRY);

    // Create JWT payloads
    const accessPayload: JWTPayload = {
      userId: user.id!,
      deviceId: actualDeviceId,
      sessionId,
      businessId: user.businessId,
      type: 'access',
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(accessExpiry.getTime() / 1000)
    };

    const refreshPayload: JWTPayload = {
      userId: user.id!,
      deviceId: actualDeviceId,
      sessionId,
      businessId: user.businessId,
      type: 'refresh',
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(refreshExpiry.getTime() / 1000)
    };

    // Generate tokens
    const accessToken = await createJWT(accessPayload);
    const refreshToken = await createJWT(refreshPayload);

    // Create session record
    const session: Session = {
      userId: user.id!,
      deviceId: actualDeviceId,
      deviceFingerprint,
      accessToken,
      refreshToken,
      createdAt: now,
      expiresAt: refreshExpiry,
      lastActivity: now,
      isActive: true,
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent
    };

    const sessionIdDb = await db.sessions.add(session);
    session.id = sessionIdDb.toString();

    return session;
  }

  static async validateAccessToken(token: string): Promise<JWTPayload | null> {
    const payload = await verifyJWT(token);
    if (!payload || payload.type !== 'access') return null;

    // Check if session is still active
    const session = await db.sessions.where('userId').equals(payload.userId).first();
    if (!session || !session.isActive || session.invalidatedAt) return null;

    // Check device fingerprint
    const currentFingerprint = getDeviceFingerprint();
    if (session.deviceFingerprint !== currentFingerprint) {
      await this.invalidateSession(session.id!);
      return null;
    }

    // Update last activity
    await db.sessions.update(session.id!, { lastActivity: new Date() });

    return payload;
  }

  static async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    const payload = await verifyJWT(refreshToken);
    if (!payload || payload.type !== 'refresh') return null;

    // Check if session exists and is active
    const session = await db.sessions.where('userId').equals(payload.userId).first();
    if (!session || !session.isActive || session.invalidatedAt) return null;

    // Check if refresh token has expired
    if (new Date() > session.expiresAt) {
      await this.invalidateSession(session.id!);
      return null;
    }

    const now = new Date();
    const accessExpiry = new Date(now.getTime() + this.ACCESS_TOKEN_EXPIRY);

    // Create new access token
    const accessPayload: JWTPayload = {
      userId: payload.userId,
      deviceId: payload.deviceId,
      sessionId: payload.sessionId,
      businessId: payload.businessId,
      type: 'access',
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(accessExpiry.getTime() / 1000)
    };

    const newAccessToken = await createJWT(accessPayload);

    // Update session with new access token
    await db.sessions.update(session.id!, { lastActivity: now });

    return {
      accessToken: newAccessToken,
      refreshToken: refreshToken // Keep same refresh token
    };
  }

  static async getCurrentSession(): Promise<Session | null> {
    const storedTokens = this.getStoredTokens();
    if (!storedTokens) return null;

    const payload = await this.validateAccessToken(storedTokens.accessToken);
    if (!payload) return null;

    const session = await db.sessions.get(payload.sessionId);
    return session || null;
  }

  static async getCurrentUser(): Promise<User | null> {
    const session = await this.getCurrentSession();
    if (!session) return null;

    const user = await db.users.get(session.userId);
    return user || null;
  }

  static async logout(sessionId?: string): Promise<void> {
    if (sessionId) {
      await this.invalidateSession(sessionId);
    } else {
      // Logout current session
      const session = await this.getCurrentSession();
      if (session) {
        await this.invalidateSession(session.id!);
      }
    }

    this.clearStoredTokens();
  }

  static async invalidateSession(sessionId: string): Promise<void> {
    await db.sessions.update(sessionId, {
      isActive: false,
      invalidatedAt: new Date()
    });
  }

  static async invalidateAllUserSessions(userId: string): Promise<void> {
    const sessions = await db.sessions.where('userId').equals(userId).toArray();
    for (const session of sessions) {
      await this.invalidateSession(session.id!);
    }
  }

  static async checkSessionTimeout(): Promise<boolean> {
    const session = await this.getCurrentSession();
    if (!session) return true; // No session = timed out

    const now = new Date();
    const timeSinceActivity = now.getTime() - session.lastActivity.getTime();
    const timeSinceCreation = now.getTime() - session.createdAt.getTime();

    // Check inactivity timeout
    if (timeSinceActivity > this.INACTIVITY_TIMEOUT) {
      await this.invalidateSession(session.id!);
      return true;
    }

    // Check shift timeout
    if (timeSinceCreation > this.SHIFT_TIMEOUT) {
      await this.invalidateSession(session.id!);
      return true;
    }

    return false;
  }

  static async extendSession(): Promise<void> {
    const session = await this.getCurrentSession();
    if (session) {
      await db.sessions.update(session.id!, { lastActivity: new Date() });
    }
  }

  // Storage methods (secure localStorage with encryption)
  static getStoredTokens(): { accessToken: string; refreshToken: string } | null {
    try {
      const encrypted = localStorage.getItem('secure_session');
      if (!encrypted) return null;

      // In production, decrypt the tokens
      return JSON.parse(encrypted);
    } catch (error) {
      console.error('Error reading stored tokens:', error);
      return null;
    }
  }

  static storeTokens(accessToken: string, refreshToken: string): void {
    const tokens = { accessToken, refreshToken };
    // In production, encrypt these tokens
    localStorage.setItem('secure_session', JSON.stringify(tokens));
  }

  private static clearStoredTokens(): void {
    localStorage.removeItem('secure_session');
  }

  private static getClientIP(): string {
    // This is a simplified version. In production, you'd get this from the server
    return 'client-ip-not-available';
  }

  // Admin methods for session management
  static async getActiveSessions(): Promise<Session[]> {
    return await db.sessions
      .where('isActive')
      .equals(1) // Dexie stores booleans as 1/0
      .toArray();
  }

  static async forceLogoutUser(userId: string, adminUserId: string): Promise<void> {
    await this.invalidateAllUserSessions(userId);
    // Log the admin action
    console.log(`Admin ${adminUserId} forced logout of user ${userId}`);
  }

  static async forceLogoutDevice(deviceId: string, adminUserId: string): Promise<void> {
    const sessions = await db.sessions.where('deviceId').equals(deviceId).toArray();
    for (const session of sessions) {
      await this.invalidateSession(session.id!);
    }
    console.log(`Admin ${adminUserId} forced logout of device ${deviceId}`);
  }
}