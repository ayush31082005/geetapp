import { Router } from 'express';
import { ContactController } from '../controllers/contactController.js';

const router = Router();

// POST /api/contacts/sync
router.post('/sync', ContactController.syncContacts);

// GET /api/contacts/:mobile
router.get('/:mobile', ContactController.getContacts);

export default router;
