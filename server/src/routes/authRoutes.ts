import { Router } from 'express';
import { sendOtp, verifyOtp, getMe } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// Public auth routes
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

// Protected routes
router.get('/me', authenticateToken, getMe);

export default router;
