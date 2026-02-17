/**
 * Normalize a phone number for WhatsApp (digits only, with country code).
 *
 * Examples:
 *   "+94 77 123 4567"  => "94771234567"
 *   "077 123 4567"     => "94771234567"
 *   "0771234567"       => "94771234567"
 *   "+1 555 123 4567"  => "15551234567"
 *   "94771234567"      => "94771234567"
 */
export function normalizePhoneForWhatsApp(phone: string): string {
  let digits = phone.replace(/\D/g, "");

  // Sri Lankan local format: starts with 0, 10 digits total
  if (digits.startsWith("0") && digits.length === 10) {
    digits = "94" + digits.slice(1);
  }

  return digits;
}

/**
 * Validate that a normalized phone number is 10-15 digits (E.164 range).
 */
export function isValidWhatsAppNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}
