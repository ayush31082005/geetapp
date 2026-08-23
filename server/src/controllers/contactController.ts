import { Request, Response } from 'express';
import { ContactModel } from '../models/contactModel.js';

export class ContactController {
  /**
   * POST /api/contacts/sync
   * Body: { userMobile, userId?, stage?, contacts: [{ name, number }] }
   */
  static async syncContacts(req: Request, res: Response): Promise<void> {
    try {
      const { userMobile, userId, stage, contacts } = req.body;

      if (!userMobile) {
        res.status(400).json({
          success: false,
          message: 'userMobile is required for contact sync',
        });
        return;
      }

      const result = await ContactModel.syncContacts({
        userMobile,
        userId: userId ? Number(userId) : null,
        stage: stage || 'OTP_AGREE',
        contacts: Array.isArray(contacts) ? contacts : [],
      });

      res.status(200).json({
        success: true,
        message: `Successfully synced ${result.inserted} contacts`,
        data: result,
      });
    } catch (error: any) {
      console.error('❌ [ContactController Error]:', error.message);
      res.status(500).json({
        success: false,
        message: 'Internal server error while syncing contacts',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/contacts/:mobile
   */
  static async getContacts(req: Request, res: Response): Promise<void> {
    try {
      const mobile = String(req.params.mobile || '');
      const limit = Number(req.query.limit) || 200;

      const result = await ContactModel.getContactsByUser(mobile, limit);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('❌ [ContactController Error]:', error.message);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching contacts',
        error: error.message,
      });
    }
  }
}
