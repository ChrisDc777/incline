import * as Crypto from 'expo-crypto';

/** Client-generated UUID for syncable row identity (stable across devices). */
export function newUuid(): string {
  return Crypto.randomUUID();
}
