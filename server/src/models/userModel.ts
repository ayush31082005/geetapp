import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../config/db.js';

export interface IUser {
  id: number;
  uuid: string;
  lead_number: string;
  lead_reference_number?: string | null;
  application_number?: string | null;
  mobile_number: string;
  telecaller_id?: number | null;
  referral_code?: string | null;
  lead_source?: string;
  credit_manager_id?: number | null;
  telecaller_stage?: string | null;
  mobile_prefill_data?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface IUserProfile {
  id?: number;
  user_id: number;
  full_name?: string | null;
  father_name?: string | null;
  mother_name?: string | null;
  dob?: string | null;
  gender?: 'Male' | 'Female' | 'Other' | null;
  marital_status?: string | null;
  religion?: string | null;
  education?: string | null;
  address_type?: 'own' | 'rented' | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  rent_amount?: number | null;
  personal_email?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface UserWithProfile extends IUser {
  full_name?: string | null;
  personal_email?: string | null;
  dob?: string | null;
  gender?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
}

export class UserModel {
  /**
   * Find a user by mobile number
   */
  static async findByMobile(mobileNumber: string): Promise<IUser | null> {
    const cleanMobile = mobileNumber.replace(/\D/g, '').slice(-10);
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM users WHERE mobile_number = ? LIMIT 1`,
      [cleanMobile]
    );
    return (rows[0] as IUser) || null;
  }

  /**
   * Find a user by ID
   */
  static async findById(id: number): Promise<IUser | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM users WHERE id = ? LIMIT 1`,
      [id]
    );
    return (rows[0] as IUser) || null;
  }

  /**
   * Create a new user with default profile
   */
  static async create(params: {
    uuid: string;
    leadNumber: string;
    mobileNumber: string;
    leadSource?: string;
  }): Promise<IUser> {
    const cleanMobile = params.mobileNumber.replace(/\D/g, '').slice(-10);
    const leadSource = params.leadSource || 'App';

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO users (uuid, lead_number, mobile_number, lead_source, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [params.uuid, params.leadNumber, cleanMobile, leadSource]
    );

    const insertedId = result.insertId;

    // Create corresponding entry in user_profiles
    try {
      await pool.execute(
        `INSERT INTO user_profiles (user_id, full_name, created_at) VALUES (?, 'GeetPay Customer', NOW())`,
        [insertedId]
      );
    } catch (e: any) {
      console.warn('⚠️ [UserModel] Profile insert warning:', e.message);
    }

    return {
      id: insertedId,
      uuid: params.uuid,
      lead_number: params.leadNumber,
      mobile_number: cleanMobile,
      lead_source: leadSource,
    };
  }

  /**
   * Get user along with profile details
   */
  static async getUserWithProfile(idOrMobile: number | string): Promise<UserWithProfile | null> {
    let query = `
      SELECT u.id, u.uuid, u.lead_number, u.lead_reference_number, u.application_number,
             u.mobile_number, u.lead_source, u.created_at, u.updated_at,
             p.full_name, p.personal_email, p.dob, p.gender, p.city, p.state, p.pincode
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
    `;

    let params: any[] = [];
    if (typeof idOrMobile === 'number' || !isNaN(Number(idOrMobile)) && idOrMobile.toString().length < 10) {
      query += ` WHERE u.id = ? LIMIT 1`;
      params = [Number(idOrMobile)];
    } else {
      const clean = idOrMobile.toString().replace(/\D/g, '').slice(-10);
      query += ` WHERE u.mobile_number = ? LIMIT 1`;
      params = [clean];
    }

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    return (rows[0] as UserWithProfile) || null;
  }

  /**
   * Check if user exists and has an approved sanction letter / loan in MySQL
   */
  static async checkSanctionApproval(mobileNumber: string): Promise<{
    approved: boolean;
    reason: string;
    user?: IUser | null;
    approvedAmount?: number;
  }> {
    const cleanMobile = mobileNumber.replace(/\D/g, '').slice(-10);

    // 1. Check if user exists in `users` table
    const user = await this.findByMobile(cleanMobile);
    if (!user) {
      return {
        approved: false,
        reason: 'This mobile number is not registered or does not have an active loan application.',
        user: null,
      };
    }

    const userId = user.id;

    // 2. Check `cam_details` (Approved CAM / Sanction Amount)
    try {
      const [camRows]: any = await pool.execute(
        `SELECT id, loan_approved, loan_amount, created_at FROM cam_details WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
        [userId]
      );
      if (camRows && camRows.length > 0) {
        const approvedAmt = Number(camRows[0].loan_approved || camRows[0].loan_amount || 0);
        if (approvedAmt > 0) {
          return {
            approved: true,
            reason: 'Sanction Letter Approved via CAM',
            user,
            approvedAmount: approvedAmt,
          };
        }
      }
    } catch (err: any) {
      console.warn('⚠️ [UserModel] CAM check warning:', err.message);
    }

    // 3. Check `leads` table status
    try {
      const [leadRows]: any = await pool.execute(
        `SELECT id, status, loan_id FROM leads WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
        [userId]
      );
      if (leadRows && leadRows.length > 0) {
        const lead = leadRows[0];
        const statusUpper = (lead.status || '').toUpperCase();
        const approvedStatuses = ['COMPLETED', 'DISBURSED', 'SANCTIONED', 'APPROVED', 'SENT_TO_ACCOUNTS'];
        if (approvedStatuses.includes(statusUpper) || lead.loan_id) {
          return {
            approved: true,
            reason: `Lead Status: ${lead.status}`,
            user,
          };
        }
      }
    } catch (err: any) {
      console.warn('⚠️ [UserModel] Lead check warning:', err.message);
    }

    // 4. Check `disbursements` table
    try {
      const [disbRows]: any = await pool.execute(
        `SELECT id, amount FROM disbursements WHERE user_id = ? LIMIT 1`,
        [userId]
      );
      if (disbRows && disbRows.length > 0) {
        return {
          approved: true,
          reason: 'Loan Disbursed',
          user,
          approvedAmount: Number(disbRows[0].amount || 0),
        };
      }
    } catch (err: any) {
      console.warn('⚠️ [UserModel] Disbursement check warning:', err.message);
    }

    // 5. Check `applications` table
    try {
      const [appRows]: any = await pool.execute(
        `SELECT id, status FROM applications WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
        [userId]
      );
      if (appRows && appRows.length > 0) {
        const appStatus = (appRows[0].status || '').toUpperCase();
        if (['APPROVED', 'SANCTIONED', 'DISBURSED'].includes(appStatus)) {
          return {
            approved: true,
            reason: `Application Status: ${appRows[0].status}`,
            user,
          };
        }
      }
    } catch (err: any) {
      console.warn('⚠️ [UserModel] Application check warning:', err.message);
    }

    return {
      approved: false,
      reason: 'Your Sanction Letter is not approved yet.',
      user,
    };
  }
}
