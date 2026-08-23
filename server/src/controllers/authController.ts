import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserModel, OtpModel } from '../models/index.js';
import { sendWhatsAppOtp } from '../services/whatsappService.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_long_random_secret';

// Helper to generate a 4-digit OTP
function generate4DigitOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * POST /api/auth/send-otp
 * Body: { mobile: "9876543210" }
 */
export async function sendOtp(req: Request, res: Response): Promise<void> {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      res.status(400).json({ success: false, message: 'Mobile number is required' });
      return;
    }

    const cleanMobile = mobile.toString().replace(/\D/g, '').slice(-10);

    if (cleanMobile.length !== 10) {
      res.status(400).json({ success: false, message: 'Invalid 10-digit mobile number' });
      return;
    }

    // Generate 4-digit OTP
    const otp = generate4DigitOtp();

    // 1. Save OTP via OtpModel
    await OtpModel.saveOtp(cleanMobile, otp, 5);

    // 2. Dispatch via WhatsApp Gateway Service
    const waResult = await sendWhatsAppOtp(cleanMobile, otp);

    console.log(`\n📢 [CONSOLE OTP READY] User: +91 ${cleanMobile} | OTP: >>> ${otp} <<<\n`);

    res.status(200).json({
      success: true,
      message: 'OTP has been sent to your WhatsApp number!',
      mobile: cleanMobile,
      otpLength: 4,
      whatsappDispatched: waResult.success,
    });
  } catch (error: any) {
    console.error('❌ [SEND-OTP ERROR]:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
  }
}

/**
 * POST /api/auth/verify-otp
 * Body: { mobile: "9876543210", otp: "4321" }
 */
export async function verifyOtp(req: Request, res: Response): Promise<void> {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      res.status(400).json({ success: false, message: 'Both mobile and OTP are required' });
      return;
    }

    const cleanMobile = mobile.toString().replace(/\D/g, '').slice(-10);
    const cleanOtp = otp.toString().trim();

    // 1. Verify OTP using OtpModel
    const isValid = await OtpModel.verify(cleanMobile, cleanOtp);

    if (!isValid) {
      console.log(`❌ [VERIFY-OTP FAILED] Mobile: +91 ${cleanMobile} entered INVALID or EXPIRED OTP: ${cleanOtp}`);
      res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please enter the correct OTP.' });
      return;
    }

    // Mark OTP consumed
    await OtpModel.consumeOtp(cleanMobile, cleanOtp);

    // 2. Find or Create User using UserModel
    let user = await UserModel.findByMobile(cleanMobile);

    if (!user) {
      const userUuid = crypto.randomUUID();
      const leadNumber = `GP${Date.now().toString().slice(-8)}`;

      user = await UserModel.create({
        uuid: userUuid,
        leadNumber: leadNumber,
        mobileNumber: cleanMobile,
        leadSource: 'App',
      });
    }

    // Retrieve user with profile details
    const userWithProfile = await UserModel.getUserWithProfile(user.id);

    const userName = userWithProfile?.full_name || 'GeetPay Customer';
    const userEmail = userWithProfile?.personal_email || null;

    // 3. Generate JWT Token
    const token = jwt.sign(
      { id: user.id, mobile: user.mobile_number, uuid: user.uuid },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // 4. Log Success Banner to Console
    console.log('\n' + '★'.repeat(60));
    console.log('🎉  [LOGIN SUCCESSFUL]');
    console.log(`👤  User ID     : ${user.id}`);
    console.log(`🆔  Lead Number : ${user.lead_number || 'N/A'}`);
    console.log(`📱  Mobile      : +91 ${user.mobile_number}`);
    console.log(`📛  Name        : ${userName}`);
    console.log(`🔑  Token       : ${token.substring(0, 25)}...`);
    console.log(`⏰  Timestamp   : ${new Date().toLocaleString()}`);
    console.log('★'.repeat(60) + '\n');

    res.status(200).json({
      success: true,
      message: 'Login successful! Welcome to GeetPay.',
      token,
      user: {
        id: user.id,
        uuid: user.uuid,
        leadNumber: user.lead_number,
        mobile: user.mobile_number,
        name: userName,
        email: userEmail,
      },
    });
  } catch (error: any) {
    console.error('❌ [VERIFY-OTP ERROR]:', error.message);
    res.status(500).json({ success: false, message: 'Server error during OTP verification' });
  }
}

/**
 * GET /api/auth/me
 * Protected endpoint returning current user profile
 */
export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const mobile = req.user?.mobile;

    const userWithProfile = await UserModel.getUserWithProfile(userId || mobile || '');

    if (userWithProfile) {
      res.status(200).json({
        success: true,
        user: {
          id: userWithProfile.id,
          uuid: userWithProfile.uuid,
          leadNumber: userWithProfile.lead_number,
          mobile: userWithProfile.mobile_number,
          name: userWithProfile.full_name || 'GeetPay Customer',
          email: userWithProfile.personal_email,
          dob: userWithProfile.dob,
          gender: userWithProfile.gender,
          city: userWithProfile.city,
          state: userWithProfile.state,
          pincode: userWithProfile.pincode,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      user: { id: userId, mobile: mobile, name: 'GeetPay Customer' },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve profile' });
  }
}
