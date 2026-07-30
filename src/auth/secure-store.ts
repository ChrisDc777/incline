import * as SecureStore from 'expo-secure-store';
import { type TokenCache } from '@clerk/clerk-expo';

/**
 * SecureStore-backed token cache for Clerk.
 * Stores the session token in iOS Keychain / Android Keystore.
 *
 * Note: expo-secure-store has a ~2 KB value limit on Android.
 * Clerk's session token (JWT) is typically under 1 KB, so this works
 * without chunking. If it ever exceeds the limit, we'd need to split
 * across multiple keys.
 */
export const secureTokenCache: TokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Silently fail — Clerk will fall back to in-memory
    }
  },
  clearToken(key: string) {
    try {
      SecureStore.deleteItemAsync(key);
    } catch {
      // Silently fail
    }
  },
};
