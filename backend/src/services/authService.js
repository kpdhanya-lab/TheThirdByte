import { supabase } from '../config/supabase.js';
import { HospitalService } from './hospitalService.js';
import { OtpService } from './otpService.js';

export class AuthService {
  /**
   * Check if a phone number is already registered in patients table
   */
  static async isPhoneRegistered(phone) {
    const normalizedPhone = OtpService.normalizePhone(phone);
    const { data, error } = await supabase
      .from('patients')
      .select('id, phone_number, full_name, hospital_code')
      .eq('phone_number', normalizedPhone)
      .maybeSingle();

    if (error) {
      throw new Error(`Database error checking phone registration: ${error.message}`);
    }

    return {
      isRegistered: !!data,
      patient: data
    };
  }

  /**
   * Get patient details by phone number
   */
  static async getPatientByPhone(phone) {
    const normalizedPhone = OtpService.normalizePhone(phone);
    const { data, error } = await supabase
      .from('patients')
      .select(`
        id,
        hospital_code,
        full_name,
        phone_number,
        age,
        primary_language,
        gender,
        residential_address,
        email,
        emergency_contact,
        created_at,
        hospitals (
          name,
          is_active
        )
      `)
      .eq('phone_number', normalizedPhone)
      .maybeSingle();

    if (error) {
      throw new Error(`Database error fetching patient: ${error.message}`);
    }

    return data;
  }

  /**
   * Register a new patient
   */
  static async registerPatient({
    hospitalCode,
    fullName,
    phoneNumber,
    age,
    primaryLanguage,
    gender,
    residentialAddress,
    email,
    emergencyContact
  }) {
    // 1. Validate Hospital ID
    const hospitalValidation = await HospitalService.validateHospitalCode(hospitalCode);
    if (!hospitalValidation.isValid) {
      throw new Error(hospitalValidation.message);
    }
    const cleanHospitalCode = HospitalService.normalizeCode(hospitalCode);

    // 2. Validate mandatory fields
    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      throw new Error('Patient Full Name is required.');
    }
    if (!phoneNumber) {
      throw new Error('Mobile Number is required for SMS & OTP.');
    }
    const normalizedPhone = OtpService.normalizePhone(phoneNumber);
    if (normalizedPhone.length < 10) {
      throw new Error('Please provide a valid 10-digit mobile number.');
    }

    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 130) {
      throw new Error('Age must be a valid number between 0 and 130.');
    }

    if (!primaryLanguage || !primaryLanguage.trim()) {
      throw new Error('Primary language is required.');
    }

    if (!gender || !gender.trim()) {
      throw new Error('Gender designation is required.');
    }

    if (!residentialAddress || !residentialAddress.trim()) {
      throw new Error('Residential address is required.');
    }

    if (!emergencyContact || !emergencyContact.trim()) {
      throw new Error('Emergency contact is required.');
    }

    // 3. Check if phone number is already registered
    const { isRegistered } = await this.isPhoneRegistered(normalizedPhone);
    if (isRegistered) {
      throw new Error(`Mobile number '${normalizedPhone}' is already registered. Please go to Login.`);
    }

    // 4. Insert into database
    const patientPayload = {
      hospital_code: cleanHospitalCode,
      full_name: fullName.trim(),
      phone_number: normalizedPhone,
      age: parsedAge,
      primary_language: primaryLanguage.trim(),
      gender: gender.trim(),
      residential_address: residentialAddress.trim(),
      email: email ? email.trim() : null,
      emergency_contact: emergencyContact.trim()
    };

    const { data: newPatient, error } = await supabase
      .from('patients')
      .insert([patientPayload])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('A patient with this mobile number is already registered.');
      }
      throw new Error(`Failed to register patient: ${error.message}`);
    }

    // Generate initial OTP or verification token
    const otpDetails = OtpService.generateOtp(normalizedPhone, cleanHospitalCode);

    return {
      message: 'Patient registered successfully.',
      patient: newPatient,
      hospital: hospitalValidation.hospital,
      otpInfo: {
        phone: otpDetails.phone,
        // Expose code in dev for rapid testing
        devOtp: process.env.NODE_ENV !== 'production' ? otpDetails.code : undefined,
        expiresAt: otpDetails.expiresAt
      }
    };
  }

  /**
   * Step 1 of Login: Validate Hospital ID + Registered Phone, then issue OTP
   */
  static async requestLoginOtp({ hospitalCode, phoneNumber }) {
    if (!hospitalCode) {
      throw new Error('Hospital ID is required.');
    }
    if (!phoneNumber) {
      throw new Error('Mobile number is required.');
    }

    // 1. Verify Hospital ID
    const hospitalValidation = await HospitalService.validateHospitalCode(hospitalCode);
    if (!hospitalValidation.isValid) {
      throw new Error(hospitalValidation.message);
    }

    // 2. Verify Mobile Number is registered in patients table
    const normalizedPhone = OtpService.normalizePhone(phoneNumber);
    const { isRegistered, patient } = await this.isPhoneRegistered(normalizedPhone);
    if (!isRegistered) {
      throw new Error(`Mobile number '${normalizedPhone}' is not registered. Please register first to access the portal.`);
    }

    // 3. Generate & Dispatch OTP
    const cleanHospitalCode = HospitalService.normalizeCode(hospitalCode);
    const otpDetails = OtpService.generateOtp(normalizedPhone, cleanHospitalCode);

    return {
      message: 'OTP sent successfully to registered mobile number.',
      phone: normalizedPhone,
      hospital: hospitalValidation.hospital,
      patientName: patient.full_name,
      // For development/testing convenience:
      devOtp: process.env.NODE_ENV !== 'production' ? otpDetails.code : undefined,
      expiresAt: otpDetails.expiresAt
    };
  }

  /**
   * Step 2 of Login: Verify OTP and grant portal access
   */
  static async verifyLogin({ hospitalCode, phoneNumber, otp }) {
    if (!hospitalCode || !phoneNumber || !otp) {
      throw new Error('Hospital ID, mobile number, and OTP are required.');
    }

    // Re-verify hospital ID is still active
    const hospitalValidation = await HospitalService.validateHospitalCode(hospitalCode);
    if (!hospitalValidation.isValid) {
      throw new Error(hospitalValidation.message);
    }

    // Verify OTP
    const normalizedPhone = OtpService.normalizePhone(phoneNumber);
    const otpResult = OtpService.verifyOtp(normalizedPhone, otp);
    if (!otpResult.success) {
      throw new Error(otpResult.message);
    }

    // Fetch full patient profile
    const patientProfile = await this.getPatientByPhone(normalizedPhone);
    if (!patientProfile) {
      throw new Error('Patient record not found. Please register first.');
    }

    return {
      message: 'Authentication successful. Welcome to the Patient Portal.',
      patient: patientProfile,
      hospital: hospitalValidation.hospital,
      authenticatedAt: new Date().toISOString()
    };
  }
}
