import { db, Session, User, JWTPayload } from '../../db';
import { createJWT, verifyJWT, getDeviceFingerprint, generateDeviceId } from '../../utils/auth';

export class SecureSessionService {
  private static readonly ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes
  private static readonly REFRESH_TOKEN_EXPIRY = 8 * 60 * 60 * 1000; // 8 hours
  private static readonly SHIFT_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours
  private static readonly INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  // In-memory storage for access token (not persisted)
  private static currentAccessToken: string | null = null;

  static async createSession(user: User, deviceId?: string): Promise<Session & { accessToken: string; refreshToken: string }> {
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

    // Create session record (tokens not stored in DB for security)
    const session: Session = {
      id: generateDeviceId(),
      userId: user.id!,
      deviceId: actualDeviceId,
      deviceFingerprint,
      createdAt: now,
      expiresAt: refreshExpiry,
      lastActivity: now,
      isActive: true,
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent
    };

    await db.sessions.add(session);

    return {
      ...session,
      accessToken,
      refreshToken
    };
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
    const refreshToken = await this.getStoredRefreshToken();
    if (!refreshToken) return null;

    // Check if we have a valid access token in memory
    const accessToken = this.getAccessToken();
    if (accessToken) {
      const payload = await this.validateAccessToken(accessToken);
      if (payload) {
        const session = await db.sessions.get(payload.sessionId);
        return session || null;
      }
    }

    // No valid access token, try to refresh
    const newTokens = await this.refreshAccessToken(refreshToken);
    if (newTokens) {
      this.setAccessToken(newTokens.accessToken);
      const payload = await this.validateAccessToken(newTokens.accessToken);
      if (payload) {
        const session = await db.sessions.get(payload.sessionId);
        return session || null;
      }
    }

    return null;
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

    this.clearAccessToken();
    await this.clearStoredTokens();
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

  // In-memory access token management
  static setAccessToken(token: string): void {
    this.currentAccessToken = token;
  }

  static getAccessToken(): string | null {
    return this.currentAccessToken;
  }

  static clearAccessToken(): void {
    this.currentAccessToken = null;
  }

  // Storage methods (secure encrypted storage)
  static async getStoredRefreshToken(): Promise<string | null> {
    try {
      const encryptedData = localStorage.getItem('secure_session');
      if (!encryptedData) return null;

      const data = JSON.parse(encryptedData);
      if (!data.encryptedRefreshToken || !data.iv || !data.userId) return null;

      // Derive key from device fingerprint + user ID
      const key = await this.deriveEncryptionKey(data.userId);

      // Decrypt refresh token
      const refreshToken = await this.decryptToken(data.encryptedRefreshToken, data.iv, key);
      return refreshToken;
    } catch (error) {
      console.error('Error reading stored refresh token:', error);
      return null;
    }
  }

  static async storeTokens(_accessToken: string, refreshToken: string): Promise<void> {
    try {
      // Get current user to derive key
      const currentSession = await this.getCurrentSession();
      if (!currentSession) return;

      // Derive key from device fingerprint + user ID
      const key = await this.deriveEncryptionKey(currentSession.userId);

      // Encrypt refresh token
      const { encrypted: encryptedRefreshToken, iv } = await this.encryptToken(refreshToken, key);

      const data = {
        userId: currentSession.userId,
        encryptedRefreshToken,
        iv: Array.from(iv), // Convert Uint8Array to array for JSON storage
        deviceFingerprint: currentSession.deviceFingerprint,
        createdAt: new Date().toISOString()
      };

      localStorage.setItem('secure_session', JSON.stringify(data));
    } catch (error) {
      console.error('Error storing tokens:', error);
    }
  }

  private static async deriveEncryptionKey(userId: string): Promise<CryptoKey> {
    const deviceFingerprint = getDeviceFingerprint();
    const keyMaterial = `${deviceFingerprint}:${userId}`;

    const keyData = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(keyMaterial),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('nexus-session-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private static async encryptToken(token: string, key: CryptoKey): Promise<{ encrypted: string; iv: Uint8Array }> {
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96 bits for GCM
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(token)
    );

    return {
      encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv
    };
  }

  private static async decryptToken(encryptedToken: string, iv: number[], key: CryptoKey): Promise<string> {
    const encrypted = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));
    const ivArray = new Uint8Array(iv);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivArray },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  }

  private static async clearStoredTokens(): Promise<void> {
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