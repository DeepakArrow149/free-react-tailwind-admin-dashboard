/**
 * Token Service
 * Manages authentication token persistence.
 */

import { STORAGE_KEYS } from '@/core/constants';

class TokenService {
  getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  setTokens(accessToken: string, refreshToken?: string): void {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, accessToken);
    if (refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
  }

  clearTokens(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Decode JWT payload (without verification — for reading claims only)
   */
  decodeToken(token: string): Record<string, unknown> | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(window.atob(base64));
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token?: string | null): boolean {
    const t = token || this.getAccessToken();
    if (!t) return true;
    const decoded = this.decodeToken(t);
    if (!decoded || !decoded.exp) return true;
    return Date.now() >= (decoded.exp as number) * 1000;
  }
}

export const tokenService = new TokenService();
