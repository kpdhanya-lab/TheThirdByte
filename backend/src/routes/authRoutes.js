import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';

const router = Router();

// Validate hospital code in login / register form
router.post('/validate-hospital', AuthController.validateHospital);

// Check if phone number is already registered
router.get('/check-phone', AuthController.checkPhone);

// Register a new patient
router.post('/register', AuthController.register);

// Login Step 1: Check Hospital ID + phone number and request OTP
router.post('/login-request-otp', AuthController.requestLoginOtp);

// Login Step 2: Verify OTP and grant portal session
router.post('/login-verify-otp', AuthController.verifyLoginOtp);

// Patient profile lookup
router.get('/profile', AuthController.getProfile);

export default router;
