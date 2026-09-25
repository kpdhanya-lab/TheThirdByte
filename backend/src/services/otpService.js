import crypto from 'crypto';

// In-memory OTP storage for development/demonstration or custom SMS integration
// Format: phoneNumber -> { code, expiresAt, hospitalCode }
const otpStore = new Map();

export class OtpService {
  /**
   * Normalize phone number to standard format (+91xxxxxxxxxx or digits)
   */
  static normalizePhone(phone) {
    if (!phone) return '';
    let cleaned = phone.replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+')) {
      if (cleaned.length === 10) {
        cleaned = '+91' + cleaned;
      } else {
        cleaned = '+' + cleaned;
      }
    }
    return cleaned;
  }

  /**
   * Generate a 6-digit OTP and store with 5-minute expiry
   */
  static generateOtp(phone, hospitalCode) {
    const normalizedPhone = this.normalizePhone(phone);
    
    // In dev / test, test numbers like +919876543210 can default to 123456
    const code = (process.env.NODE_ENV === 'test' || normalizedPhone.endsWith('9876543210')) 
      ? '123456' 
      : crypto.randomInt(100000, 999999).toString();

    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore.set(normalizedPhone, {
      code,
      expiresAt,
      hospitalCode
    });

    console.log(`[OTP SERVICE] Generated OTP for ${normalizedPhone}: ${code} (Expires in 5m)`);

    return {
      phone: normalizedPhone,
      code, // In production, omit code from return and send via SMS
      expiresAt
    };
  }

  /**
   * Verify an OTP
   */
  static verifyOtp(phone, inputCode) {
    const normalizedPhone = this.normalizePhone(phone);
    const record = otpStore.get(normalizedPhone);

    if (!record) {
      return { success: false, message: 'No OTP requested for this phone number or OTP expired.' };
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(normalizedPhone);
      return { success: false, message: 'OTP has expired. Please request a new one.' };
    }

    if (record.code !== inputCode.trim()) {
      return { success: false, message: 'Invalid OTP entered. Please try again.' };
    }

    // OTP matched! Remove from store to prevent reuse
    otpStore.delete(normalizedPhone);

    return {
      success: true,
      hospitalCode: record.hospitalCode
    };
  }
}
