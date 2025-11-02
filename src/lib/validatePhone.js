import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Validates and normalizes a phone number
 * @param {string} phone - phone number from user input
 * @param {string} [defaultCountry='NG'] - default country code (e.g., 'US', 'GB', 'NG')
 * @returns {{ valid: boolean, formatted?: string, error?: string }}
 */
export function validatePhone(phone, defaultCountry = 'NG') {
  try {
    const phoneNumber = parsePhoneNumberFromString(phone, defaultCountry);

    if (!phoneNumber || !phoneNumber.isValid()) {
      return { valid: false, error: 'Invalid phone number format' };
    }

    return { valid: true, formatted: phoneNumber.number }; // e.g. +2348123456789
  } catch (err) {
    return { valid: false, error: 'Error parsing phone number' };
  }
}
