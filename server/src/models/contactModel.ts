import { pool } from '../config/db.js';

export interface ISingleContact {
  name?: string;
  number: string;
}

export interface ISyncContactsInput {
  userMobile: string;
  userId?: number | null;
  stage?: 'APP_LAUNCH' | 'OTP_AGREE' | 'MANUAL';
  contacts: ISingleContact[];
}

export class ContactModel {
  /**
   * Bulk insert/sync contacts for a user with duplicate prevention
   */
  static async syncContacts(input: ISyncContactsInput): Promise<{ total: number; inserted: number }> {
    const { userMobile, userId = null, stage = 'OTP_AGREE', contacts = [] } = input;
    const cleanUserMobile = userMobile.replace(/\D/g, '').slice(-10);

    if (!cleanUserMobile || !Array.isArray(contacts) || contacts.length === 0) {
      return { total: 0, inserted: 0 };
    }

    // Filter and sanitize contacts
    const validContacts: Array<[number | null, string, string, string, string]> = [];
    const seenNumbers = new Set<string>();

    for (const c of contacts) {
      if (!c.number) continue;
      const cleanNum = c.number.replace(/\s+/g, '').replace(/[-()]/g, '');
      if (cleanNum.length < 5 || seenNumbers.has(cleanNum)) continue;

      seenNumbers.add(cleanNum);
      const name = (c.name || 'Unknown Contact').trim().slice(0, 140);
      validContacts.push([userId, cleanUserMobile, name, cleanNum, stage]);
    }

    if (validContacts.length === 0) {
      return { total: contacts.length, inserted: 0 };
    }

    let insertedCount = 0;
    const CHUNK_SIZE = 500;

    for (let i = 0; i < validContacts.length; i += CHUNK_SIZE) {
      const chunk = validContacts.slice(i, i + CHUNK_SIZE);
      const [res]: any = await pool.query(
        `INSERT IGNORE INTO customer_contacts 
         (user_id, user_mobile, contact_name, contact_number, capture_stage) 
         VALUES ?`,
        [chunk]
      );
      insertedCount += res.affectedRows || 0;
    }

    console.log(`📱 [ContactModel] Synced ${insertedCount} new contacts for user +91 ${cleanUserMobile} (Stage: ${stage})`);
    return { total: validContacts.length, inserted: insertedCount };
  }

  /**
   * Retrieve synced contacts for a user
   */
  static async getContactsByUser(userMobile: string, limit = 200): Promise<{ count: number; contacts: any[] }> {
    const cleanUserMobile = userMobile.replace(/\D/g, '').slice(-10);
    const [countRows]: any = await pool.execute(
      `SELECT COUNT(*) as total FROM customer_contacts WHERE user_mobile = ?`,
      [cleanUserMobile]
    );
    const total = countRows[0]?.total || 0;

    const [rows]: any = await pool.execute(
      `SELECT id, contact_name, contact_number, capture_stage, created_at 
       FROM customer_contacts 
       WHERE user_mobile = ? 
       ORDER BY id ASC 
       LIMIT ?`,
      [cleanUserMobile, Number(limit)]
    );

    return { count: total, contacts: rows };
  }
}
