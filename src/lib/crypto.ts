import { createHash, timingSafeEqual } from 'node:crypto';

const PIN_PEPPER = process.env.PIN_PEPPER || 'punch_card_pepper_secret_salt';

/**
 * Hashes a 4-digit cashier PIN deterministically with SHA-256 and server-side pepper.
 * Adheres to native Node.js crypto capabilities without external package dependencies.
 */
export function hashPin(pin: string): string {
  const normalizedPin = pin.trim();
  return createHash('sha256')
    .update(`${PIN_PEPPER}:${normalizedPin}`)
    .digest('hex');
}

/**
 * Validates a submitted PIN against the stored hash using timing-safe comparison
 * to eliminate side-channel timing attack vectors.
 */
export function verifyPin(pin: string, expectedHash: string): boolean {
  if (!pin || !expectedHash) return false;
  const computedHash = hashPin(pin);
  const bufComputed = Buffer.from(computedHash, 'utf-8');
  const bufExpected = Buffer.from(expectedHash, 'utf-8');

  if (bufComputed.length !== bufExpected.length) {
    return false;
  }
  return timingSafeEqual(bufComputed, bufExpected);
}
