/**
 * Normalizes phone numbers by removing spaces, dashes, parentheses, and dots.
 * Validates that the input contains a valid phone structure (7 to 15 digits).
 */
export function normalizePhoneNumber(rawPhone: string): string | null {
  if (!rawPhone) return null;
  const digitsOnly = rawPhone.replace(/\D/g, '');
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return null;
  }
  return digitsOnly;
}

/**
 * Formats a raw digit string into an aesthetically clean, readable phone presentation.
 * E.g., '1234567890' -> '(123) 456-7890'
 */
export function formatPhoneNumber(digits: string): string {
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return digits;
}
