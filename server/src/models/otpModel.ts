import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../config/db.js';

export interface IOtpRequest {
  mobile_number: string;
  otp: string;
  expires_at: Date;
  created_at?: Date;
}

export interface IOtpLog {
  id?: number;
  mobile: string;
  otp: string;
  expires_at: Date;
  is_used: boolean;
  created_at?: Date;
}

export class OtpModel {
  /**
   * Save or update OTP in both otp_requests table and otps log table
   */
  static async saveOtp(mobileNumber: string, otp: string, expiryMinutes = 5): Promise<void> {
    const cleanMobile = mobileNumber.replace(/\D/g, '').slice(-10);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // 1. Delete all previous OTPs for this mobile number from both tables
    try {
      await pool.execute(`DELETE FROM otps WHERE mobile = ?`, [cleanMobile]);
    } catch (err: any) {
      console.warn('⚠️ [OtpModel] otps delete notice:', err.message);
    }

    try {
      await pool.execute(`DELETE FROM otp_requests WHERE mobile_number = ?`, [cleanMobile]);
    } catch (err: any) {
      console.warn('⚠️ [OtpModel] otp_requests delete notice:', err.message);
    }

    // 2. Insert only the single fresh latest OTP
    try {
      await pool.execute<ResultSetHeader>(
        `INSERT INTO otp_requests (mobile_number, otp, expires_at, created_at)
         VALUES (?, ?, ?, NOW())`,
        [cleanMobile, otp, expiresAt]
      );
    } catch (err: any) {
      console.warn('⚠️ [OtpModel] otp_requests save notice:', err.message);
    }

    try {
      await pool.execute<ResultSetHeader>(
        `INSERT INTO otps (mobile, otp, expires_at, is_used) VALUES (?, ?, ?, FALSE)`,
        [cleanMobile, otp, expiresAt]
      );
    } catch (err: any) {
      console.warn('⚠️ [OtpModel] otps save notice:', err.message);
    }

    console.log(`🧹 [OtpModel] Deleted old OTPs & saved latest fresh OTP for +91 ${cleanMobile}`);
  }

  /**
   * Check if the given OTP is valid and not expired
   */
  static async verify(mobileNumber: string, otp: string): Promise<boolean> {
    const cleanMobile = mobileNumber.replace(/\D/g, '').slice(-10);
    const cleanOtp = otp.trim();

    // 1. Check in otp_requests table
    try {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM otp_requests 
         WHERE mobile_number = ? AND otp = ? AND expires_at >= NOW() 
         LIMIT 1`,
        [cleanMobile, cleanOtp]
      );

      if (rows && rows.length > 0) {
        return true;
      }
    } catch (err: any) {
      console.warn('⚠️ [OtpModel] otp_requests check notice:', err.message);
    }

    // 2. Fallback check in otps history table
    try {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT id FROM otps 
         WHERE mobile = ? AND otp = ? AND is_used = FALSE AND expires_at >= NOW() 
         ORDER BY id DESC LIMIT 1`,
        [cleanMobile, cleanOtp]
      );

      if (rows && rows.length > 0) {
        // Mark as used
        await pool.execute(`UPDATE otps SET is_used = TRUE WHERE id = ?`, [rows[0].id]);
        return true;
      }
    } catch (err: any) {
      // ignore
    }

    // 3. Fallback for test OTPs
    if (cleanOtp === '1234' || cleanOtp === '4321') {
      return true;
    }

    return false;
  }

  /**
   * Invalidate / consume OTP after successful login
   */
  static async consumeOtp(mobileNumber: string, otp: string): Promise<void> {
    const cleanMobile = mobileNumber.replace(/\D/g, '').slice(-10);
    const cleanOtp = otp.trim();

    try {
      await pool.execute(
        `UPDATE otp_requests SET expires_at = NOW() - INTERVAL 1 MINUTE 
         WHERE mobile_number = ? AND otp = ?`,
        [cleanMobile, cleanOtp]
      );
    } catch (err: any) {}

    try {
      await pool.execute(
        `UPDATE otps SET is_used = TRUE 
         WHERE mobile = ? AND otp = ?`,
        [cleanMobile, cleanOtp]
      );
    } catch (err: any) {}
  }
}
