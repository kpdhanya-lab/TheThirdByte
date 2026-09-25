import { AuthService } from '../services/authService.js';
import { HospitalService } from '../services/hospitalService.js';

export class AuthController {
  /**
   * Validate hospital ID entered by patient
   */
  static async validateHospital(req, res) {
    try {
      const { hospitalCode } = req.body;
      const result = await HospitalService.validateHospitalCode(hospitalCode);
      if (!result.isValid) {
        return res.status(400).json({ success: false, message: result.message });
      }
      return res.status(200).json({ success: true, hospital: result.hospital });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Register a new patient
   */
  static async register(req, res) {
    try {
      const result = await AuthService.registerPatient(req.body);
      return res.status(201).json({ success: true, ...result });
    } catch (err) {
      const isConflict = err.message.includes('already registered') || err.message.includes('already exists');
      const isInvalidHospital = err.message.includes('Hospital ID');
      const status = isConflict ? 409 : (isInvalidHospital ? 400 : 422);
      return res.status(status).json({ success: false, error: err.message });
    }
  }

  /**
   * Check phone registration status
   */
  static async checkPhone(req, res) {
    try {
      const { phoneNumber } = req.query;
      if (!phoneNumber) {
        return res.status(400).json({ success: false, error: 'phoneNumber query parameter is required.' });
      }
      const result = await AuthService.isPhoneRegistered(phoneNumber);
      return res.status(200).json({ success: true, isRegistered: result.isRegistered });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Step 1: Request Login OTP (verifies Hospital ID & registered mobile number)
   */
  static async requestLoginOtp(req, res) {
    try {
      const { hospitalCode, phoneNumber } = req.body;
      const result = await AuthService.requestLoginOtp({ hospitalCode, phoneNumber });
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      const isNotRegistered = err.message.includes('not registered');
      const isInvalidHospital = err.message.includes('Hospital ID');
      const status = isNotRegistered ? 404 : (isInvalidHospital ? 400 : 422);
      return res.status(status).json({ success: false, error: err.message });
    }
  }

  /**
   * Step 2: Verify Login OTP and access portal
   */
  static async verifyLoginOtp(req, res) {
    try {
      const { hospitalCode, phoneNumber, otp } = req.body;
      const result = await AuthService.verifyLogin({ hospitalCode, phoneNumber, otp });
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      return res.status(401).json({ success: false, error: err.message });
    }
  }

  /**
   * Get authenticated patient profile
   */
  static async getProfile(req, res) {
    try {
      const { phoneNumber } = req.query;
      if (!phoneNumber) {
        return res.status(400).json({ success: false, error: 'phoneNumber is required.' });
      }
      const profile = await AuthService.getPatientByPhone(phoneNumber);
      if (!profile) {
        return res.status(404).json({ success: false, error: 'Patient profile not found.' });
      }
      return res.status(200).json({ success: true, data: profile });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
