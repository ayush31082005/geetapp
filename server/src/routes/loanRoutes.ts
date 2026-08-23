import { Router } from 'express';
import { getDashboardData } from '../controllers/loanController.js';

const router = Router();

// Dashboard route (accessible with ?mobile=... or Bearer token)
router.get('/dashboard', getDashboardData);
router.get('/dashboard/:mobile', getDashboardData);

export default router;
