/**
 * Storage Service
 * Type-safe wrapper for localStorage with JSON serialization.
 */

class StorageService {
  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const value = localStorage.getItem(key);
      if (value === null) return defaultValue ?? null;
      return JSON.parse(value) as T;
    } catch {
      return defaultValue ?? null;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to save to localStorage: ${key}`, error);
    }
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }

  clear(): void {
    localStorage.clear();
  }

  has(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }
}

export const storageService = new StorageService();
