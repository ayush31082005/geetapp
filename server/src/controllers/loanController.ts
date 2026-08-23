import { Request, Response } from 'express';
import { LoanModel } from '../models/index.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

/**
 * GET /api/loans/dashboard
 * Query param: ?mobile=9876543210 (or authenticated user from token)
 */
export async function getDashboardData(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const mobileParam = req.query.mobile as string;
    const userId = req.user?.id;
    const userMobile = req.user?.mobile;

    const lookupKey = mobileParam || userMobile || userId || '9876543210';

    const dashboardData = await LoanModel.getDisbursedLoanDetails(lookupKey);

    console.log('\n' + '═'.repeat(60));
    console.log('📊  [DASHBOARD DATA DISPATCHED]');
    console.log(`👤  Customer Name  : ${dashboardData.user.name}`);
    console.log(`📱  Mobile Number  : ${dashboardData.user.phone}`);
    console.log(`🆔  Lead ID        : ${dashboardData.loan.leadId}`);
    console.log(`💰  Disbursed Amt  : ₹${dashboardData.loan.disbursed.toLocaleString('en-IN')}`);
    console.log(`💸  Outstanding    : ₹${dashboardData.loan.outstanding.toLocaleString('en-IN')}`);
    console.log(`🏦  Bank Account   : ${dashboardData.user.bank}`);
    console.log('═'.repeat(60) + '\n');

    res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error: any) {
    console.error('❌ [DASHBOARD ERROR]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard loan details',
    });
  }
}
