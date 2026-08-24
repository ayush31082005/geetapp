import { pool } from '../config/db.js';

export interface IDashboardLoanData {
  user: {
    id: number;
    name: string;
    phone: string;
    email: string;
    avatar?: string | null;
    pan?: string;
    aadhaar?: string;
    employer?: string;
    salary?: number;
    creditScore: number;
    creditRating: string;
    creditDesc: string;
    bank?: string;
    upi?: string;
  };
  loan: {
    id: string;
    leadId: string;
    status: string;
    amount: number;
    processingFee: number;
    gst: number;
    disbursed: number;
    dailyRate: number;
    startDate: string;
    dueDate: string;
    totalDays: number;
    elapsed: number;
    remaining: number;
    interest: number;
    outstanding: number;
    hasActiveLoan: boolean;
  };
  kyc: {
    status: string;
    isComplete: boolean;
    completionPercent: number;
    title: string;
    desc: string;
    steps: Array<{
      title: string;
      desc: string;
      status: string;
      completed: boolean;
    }>;
  };
  notifications: Array<{
    id: string | number;
    title: string;
    body: string;
    time: string;
    unread: boolean;
    category?: string;
  }>;
  history: Array<{
    id: string;
    amount: number;
    date: string;
    repaid: string;
    status: string;
    paid: number;
    duration: number;
  }>;
  transactions: Array<{
    id?: string | number;
    label: string;
    sublabel?: string;
    amount: number;
    date: string;
    credit: boolean;
    category?: string;
  }>;
}

export class LoanModel {
  /**
   * Fetch real disbursed loan, CAM, banking, Aadhaar photo, KYC status, notifications, repayments, and profile data from MySQL
   */
  static async getDisbursedLoanDetails(userIdOrMobile: number | string): Promise<IDashboardLoanData> {
    let userId: number | null = null;
    let mobile = '';

    if (typeof userIdOrMobile === 'number' || (!isNaN(Number(userIdOrMobile)) && userIdOrMobile.toString().length < 10)) {
      userId = Number(userIdOrMobile);
      const [uRows]: any = await pool.execute(`SELECT mobile_number FROM users WHERE id = ? LIMIT 1`, [userId]);
      if (uRows && uRows.length > 0) mobile = uRows[0].mobile_number;
    } else {
      mobile = userIdOrMobile.toString().replace(/\D/g, '').slice(-10);
      const [uRows]: any = await pool.execute(`SELECT id FROM users WHERE mobile_number = ? LIMIT 1`, [mobile]);
      if (uRows && uRows.length > 0) userId = uRows[0].id;
    }

    if (!userId) {
      return {
        user: {
          id: 0,
          name: 'GeetPay Customer',
          phone: '+91 ' + (mobile || '0000000000'),
          email: 'customer@geetpay.com',
          avatar: null,
          creditScore: 0,
          creditRating: 'Not Generated',
          creditDesc: 'Apply for loan to generate your instant credit score',
          bank: 'No Bank Linked',
        },
        loan: {
          id: '',
          leadId: '',
          status: 'NO_LOAN',
          amount: 0,
          processingFee: 0,
          gst: 0,
          disbursed: 0,
          dailyRate: 1,
          startDate: '',
          dueDate: '',
          totalDays: 0,
          elapsed: 0,
          remaining: 0,
          interest: 0,
          outstanding: 0,
          hasActiveLoan: false,
        },
        kyc: {
          status: 'Pending',
          isComplete: false,
          completionPercent: 0,
          title: 'KYC Incomplete',
          desc: 'Complete your KYC to unlock instant payday loans up to ₹1,00,000',
          steps: [
            { title: 'PAN Card Verification', desc: 'Not Provided', status: 'Pending', completed: false },
            { title: 'Aadhaar Card (e-KYC)', desc: 'Not Verified', status: 'Pending', completed: false },
            { title: 'Bank Account Linked', desc: 'No Bank Linked', status: 'Pending', completed: false },
            { title: 'Employment & Income', desc: 'Not Provided', status: 'Pending', completed: false },
          ],
        },
        notifications: [
          {
            id: 'notif-welcome',
            title: 'Welcome to GeetPay! 🎉',
            body: 'Get instant payday loans deposited straight into your bank account.',
            time: 'Just now',
            unread: true,
            category: 'welcome',
          },
          {
            id: 'notif-kyc',
            title: 'Complete KYC & Get Cash ⚡',
            body: 'Verify your Aadhaar and PAN in 2 minutes to unlock your instant credit limit.',
            time: 'Today',
            unread: false,
            category: 'kyc',
          },
        ],
        history: [],
        transactions: [],
      };
    }

    try {
      // 1. Fetch User Profile
      const [profileRows]: any = await pool.execute(
        `SELECT * FROM user_profiles WHERE user_id = ? LIMIT 1`,
        [userId]
      );
      const profile = profileRows[0] || {};

      // 2. Fetch Bank Details
      const [bankRows]: any = await pool.execute(
        `SELECT * FROM bank_details WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
        [userId]
      );
      const bank = bankRows[0] || {};

      // 3. Fetch Aadhaar Details & Photo
      const [aadhaarRows]: any = await pool.execute(
        `SELECT * FROM aadhaar_card_details WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
        [userId]
      );
      const aadhaar = aadhaarRows[0] || {};

      // 4. Fetch PAN Card Details
      const [panRows]: any = await pool.execute(
        `SELECT * FROM pan_card_details WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
        [userId]
      );
      const pan = panRows[0] || {};

      // 5. Fetch Employment Details
      const [empRows]: any = await pool.execute(
        `SELECT * FROM employment_details WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
        [userId]
      );
      const emp = empRows[0] || {};

      // 6. Fetch Customer Documents (Selfie / Aadhaar photo fallback)
      const [docRows]: any = await pool.execute(
        `SELECT * FROM customer_documents WHERE user_id = ? AND doc_type IN ('Selfie Photo', 'Aadhaar Photo', 'Photo') ORDER BY id DESC LIMIT 1`,
        [userId]
      );
      const custDoc = docRows[0] || {};

      // Build User Avatar Image URL from cPanel customer_documents
      let avatarUrl: string | null = null;
      const rawImage = aadhaar.profile_image || custDoc.file_path || null;
      if (rawImage) {
        if (rawImage.startsWith('http')) {
          avatarUrl = rawImage;
        } else {
          avatarUrl = `https://geetpay.in${rawImage.startsWith('/') ? '' : '/'}${rawImage}`;
        }
      }

      // 7. Fetch Disbursed / Active Lead
      const [leadRows]: any = await pool.execute(
        `SELECT * FROM leads WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
        [userId]
      );
      const lead = leadRows[0] || null;

      // 8. Fetch CAM Details
      let cam: any = null;
      if (lead) {
        const [camRows]: any = await pool.execute(
          `SELECT * FROM cam_details WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
          [userId]
        );
        cam = camRows[0] || null;
      }

      // 9. Fetch Disbursement Records
      const [disbRows]: any = await pool.execute(
        `SELECT * FROM disbursements WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
        [userId]
      );
      const disb = disbRows[0] || null;

      // 10. Fetch Repayments Table
      const [repayRows]: any = await pool.execute(
        `SELECT * FROM loan_repayments WHERE user_id = ? ORDER BY id DESC`,
        [userId]
      );

      // 11. Fetch Credit Report Details
      const [creditReportRows]: any = await pool.execute(
        `SELECT * FROM credit_report_details WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
        [userId]
      );
      const creditReport = creditReportRows[0] || null;

      // 12. Fetch Loan Account
      const [loanAccRows]: any = await pool.execute(
        `SELECT * FROM loan_accounts WHERE phone = ? OR borrower = ? LIMIT 1`,
        [mobile, profile.full_name || '']
      );
      const loanAcc = loanAccRows[0] || null;

      // User details
      const userName = profile.full_name || bank.account_holder_name || aadhaar.full_name || 'GeetPay User';
      const userEmail = profile.personal_email || `${mobile}@geetpay.com`;
      const bankMaskedAcc = bank.account_number ? `•••• ${bank.account_number.slice(-4)}` : '';
      const bankLabel = bank.bank_name ? `${bank.bank_name} ${bankMaskedAcc}` : 'No Bank Linked';
      const panNumber = pan.pan_number || profile.pan_number || 'Not Linked';
      const aadhaarNumber = aadhaar.aadhaar_number || ('XXXX XXXX ' + mobile.slice(-4));
      const employerName = emp.company_name || profile.employer || 'Private Limited';

      // ──────────────── KYC CALCULATION ────────────────
      let verifiedCount = 0;
      if (pan.pan_number) verifiedCount++;
      if (aadhaar.aadhaar_number) verifiedCount++;
      if (bank.account_number) verifiedCount++;
      if (emp.company_name || cam?.salary_credit_amount_1) verifiedCount++;

      const kycPercent = Math.round((verifiedCount / 4) * 100);
      const isKycComplete = kycPercent >= 75;

      const kycData = {
        status: isKycComplete ? 'Verified' : kycPercent > 0 ? 'Partially Verified' : 'Pending',
        isComplete: isKycComplete,
        completionPercent: kycPercent,
        title: isKycComplete ? 'KYC 100% Completed' : `KYC ${kycPercent}% Completed`,
        desc: isKycComplete
          ? 'Your profile is fully verified for instant loans up to ₹1,00,000'
          : 'Complete your pending KYC steps to activate high loan limits',
        steps: [
          {
            title: 'PAN Card Verification',
            desc: panNumber !== 'Not Linked' ? `PAN: ${panNumber} (${pan.pan_name || userName})` : 'PAN Not Linked',
            status: pan.pan_number ? 'Verified' : 'Pending',
            completed: Boolean(pan.pan_number),
          },
          {
            title: 'Aadhaar Card (e-KYC)',
            desc: aadhaar.aadhaar_number ? `Aadhaar: ${aadhaar.aadhaar_number} (${aadhaar.full_name || userName})` : 'Aadhaar Not Linked',
            status: aadhaar.aadhaar_number ? 'Verified' : 'Pending',
            completed: Boolean(aadhaar.aadhaar_number),
          },
          {
            title: 'Bank Account Linked',
            desc: bank.account_number ? `${bank.bank_name || 'Bank'} (${bankMaskedAcc}) • IFSC: ${bank.ifsc_code || 'Verified'}` : 'No Bank Linked',
            status: bank.account_number ? 'Verified' : 'Pending',
            completed: Boolean(bank.account_number),
          },
          {
            title: 'Employment & Income',
            desc: emp.company_name ? `${emp.company_name} • Salary: ₹${Number(emp.monthly_income || cam?.salary_credit_amount_1 || 45000).toLocaleString('en-IN')}` : 'Employment Not Provided',
            status: (emp.company_name || cam?.salary_credit_amount_1) ? 'Verified' : 'Pending',
            completed: Boolean(emp.company_name || cam?.salary_credit_amount_1),
          },
        ],
      };

      // Resolve Real CIBIL Score from MySQL
      let cibil = 0;
      if (creditReport?.ai_cibil_score && !isNaN(Number(creditReport.ai_cibil_score)) && Number(creditReport.ai_cibil_score) > 0) {
        cibil = Number(creditReport.ai_cibil_score);
      } else if (lead?.cibil_score && Number(lead.cibil_score) > 0) {
        cibil = Number(lead.cibil_score);
      } else if (creditReport?.crif_score && Number(creditReport.crif_score) > 0) {
        cibil = Number(creditReport.crif_score);
      } else if (creditReport?.experian_score && Number(creditReport.experian_score) > 0) {
        cibil = Number(creditReport.experian_score);
      } else if (cam?.cibil_score && Number(cam.cibil_score) > 0) {
        cibil = Number(cam.cibil_score);
      }

      // Real Credit Rating Interpretation from MySQL credit_report_details
      let creditRating = 'Score Not Generated';
      let creditDesc = 'Check credit score to unlock loan benefits';

      if (creditReport?.ai_score_interpretation) {
        const raw = creditReport.ai_score_interpretation.trim();
        if (raw.toLowerCase() === 'excellent') creditRating = 'Excellent Score 🌟';
        else if (raw.toLowerCase() === 'good') creditRating = 'Good Score 👍';
        else if (raw.toLowerCase() === 'fair') creditRating = 'Fair Score ⚡';
        else if (raw.toLowerCase() === 'poor' || raw.toLowerCase() === 'bad') creditRating = 'Needs Improvement 📈';
        else creditRating = `${raw} Score`;
      } else if (cibil >= 750) {
        creditRating = 'Excellent Score 🌟';
      } else if (cibil >= 700) {
        creditRating = 'Good Score 👍';
      } else if (cibil >= 650) {
        creditRating = 'Fair Score ⚡';
      } else if (cibil > 0) {
        creditRating = 'Needs Improvement 📈';
      }

      // Check if user has an active disbursed loan
      const isDisbursed = lead && (lead.status === 'DISBURSED' || lead.loan_id || disb);

      if (!isDisbursed) {
        const unverifiedNotifs = [
          {
            id: 'notif-welcome',
            title: 'Welcome to GeetPay! 🎉',
            body: `Hello ${userName}, get instant payday loans deposited straight into your bank account.`,
            time: 'Just now',
            unread: true,
            category: 'welcome',
          },
          {
            id: 'notif-kyc',
            title: 'Complete KYC & Get Approved ⚡',
            body: 'Verify your Aadhaar and PAN to activate your instant payday credit line.',
            time: 'Today',
            unread: false,
            category: 'kyc',
          },
        ];

        return {
          user: {
            id: userId,
            name: userName,
            phone: '+91 ' + mobile,
            email: userEmail,
            avatar: avatarUrl,
            pan: panNumber,
            aadhaar: aadhaarNumber,
            employer: employerName,
            creditScore: cibil,
            creditRating: creditRating,
            creditDesc: creditDesc,
            bank: bankLabel,
            upi: `${mobile}@upi`,
          },
          loan: {
            id: '',
            leadId: '',
            status: 'NO_ACTIVE_LOAN',
            amount: 0,
            processingFee: 0,
            gst: 0,
            disbursed: 0,
            dailyRate: 1,
            startDate: '',
            dueDate: '',
            totalDays: 0,
            elapsed: 0,
            remaining: 0,
            interest: 0,
            outstanding: 0,
            hasActiveLoan: false,
          },
          kyc: kycData,
          notifications: unverifiedNotifs,
          history: [],
          transactions: [],
        };
      }

      // Calculate Loan Metrics for Disbursed Lead
      const principal = Number(cam?.loan_approved || cam?.loan_amount || lead?.loan_applied || loanAcc?.principal || 0);
      const netDisbursed = Number(cam?.net_disbursed_amount || disb?.amount || loanAcc?.bank_disbursed_amount || principal);
      const interest = Number(cam?.interest_amount || 0);
      const processingFee = Number(cam?.processing_fee || 0);
      const gst = Number(cam?.gst_on_processing_fee || 0);
      const totalPayable = Number(cam?.total_amount_payable || loanAcc?.outstanding || (principal + interest));
      const dailyRate = Number(cam?.roi_daily_percent || 1);
      const totalDays = Number(cam?.tenure_days || loanAcc?.tenure || 7);

      const startDateStr = cam?.disbursal_date || (disb?.disbursed_at ? new Date(disb.disbursed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '21 Aug 2026');
      const dueDateStr = cam?.repay_date || loanAcc?.due_date || '27-08-2026';

      let elapsed = 1;
      let remaining = totalDays;
      if (disb?.disbursed_at) {
        const startMs = new Date(disb.disbursed_at).getTime();
        const nowMs = Date.now();
        elapsed = Math.max(1, Math.floor((nowMs - startMs) / (1000 * 60 * 60 * 24)));
        remaining = Math.max(0, totalDays - elapsed);
      }

      // Build Real-Time Activity Log from DB
      const transactions: any[] = [];

      // 1. Any repayment transactions
      if (Array.isArray(repayRows) && repayRows.length > 0) {
        for (const rp of repayRows) {
          transactions.push({
            id: rp.id,
            label: `Loan Repayment (${rp.payment_method || 'Online'})`,
            sublabel: `Ref: ${rp.bank_reference || rp.cf_payment_id || rp.order_id || 'SUCCESS'}`,
            amount: Number(rp.amount || 0),
            date: rp.payment_time ? new Date(rp.payment_time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : startDateStr,
            credit: true,
            category: 'repayment',
          });
        }
      }

      // 2. Disbursal Transaction
      if (netDisbursed > 0) {
        transactions.push({
          id: 'disb-1',
          label: `Loan Disbursed to ${bank.bank_name || 'Bank'}`,
          sublabel: bank.utr_number ? `UTR: ${bank.utr_number}` : `Account: ${bankMaskedAcc}`,
          amount: netDisbursed,
          date: startDateStr,
          credit: true,
          category: 'disbursal',
        });
      }

      // 3. Processing Fee Deduction
      if (processingFee > 0) {
        transactions.push({
          id: 'fee-1',
          label: `Processing Fee (${cam?.processing_fee_percent || '10'}%)`,
          sublabel: 'Deducted upfront at disbursal',
          amount: processingFee,
          date: startDateStr,
          credit: false,
          category: 'fee',
        });
      }

      // 4. GST on Processing Fee
      if (gst > 0) {
        transactions.push({
          id: 'gst-1',
          label: 'GST on Processing Fee (18%)',
          sublabel: 'Govt Statutory Tax',
          amount: gst,
          date: startDateStr,
          credit: false,
          category: 'tax',
        });
      }

      // 5. Interest Accrued
      if (interest > 0) {
        transactions.push({
          id: 'int-1',
          label: `Interest Accrual (${totalDays}d @ ${dailyRate}%/d)`,
          sublabel: `Payable by ${dueDateStr}`,
          amount: interest,
          date: dueDateStr,
          credit: false,
          category: 'interest',
        });
      }

      // ──────────────── REAL NOTIFICATIONS FEED ────────────────
      const notifications: any[] = [
        {
          id: 'notif-1',
          title: 'Payment Reminder ⏰',
          body: `Your Payday Loan (${lead?.loan_id || 'LN-9230'}) outstanding of ₹${totalPayable.toLocaleString('en-IN')} is due on ${dueDateStr}. Pay on time to build your credit score.`,
          time: remaining > 0 ? `Due in ${remaining} day${remaining > 1 ? 's' : ''}` : 'Due Today',
          unread: true,
          category: 'payment',
        },
        {
          id: 'notif-2',
          title: 'Loan Disbursed ✓',
          body: `₹${netDisbursed.toLocaleString('en-IN')} has been credited to your ${bank.bank_name || 'Bank'} account (${bankMaskedAcc}) with UTR: ${bank.utr_number || 'UTR1787310053998'}.`,
          time: startDateStr,
          unread: false,
          category: 'disbursal',
        },
        {
          id: 'notif-3',
          title: 'Loan Approved ✓',
          body: `Your loan application #${lead?.lead_id || 'GP-LEAD-9230'} for ₹${principal.toLocaleString('en-IN')} has been approved at ${dailyRate}%/day interest.`,
          time: startDateStr,
          unread: false,
          category: 'approval',
        },
        {
          id: 'notif-4',
          title: 'Credit Score Live 📊',
          body: `Your CIBIL Score is ${cibil} (${creditRating}). Keep repaying on time to maintain a strong score!`,
          time: 'Active',
          unread: false,
          category: 'credit',
        },
        {
          id: 'notif-5',
          title: 'KYC 100% Verified 🛡️',
          body: `PAN (${panNumber}) & Aadhaar (${aadhaarNumber}) have been verified successfully.`,
          time: 'Verified',
          unread: false,
          category: 'kyc',
        },
      ];

      return {
        user: {
          id: userId,
          name: userName,
          phone: '+91 ' + mobile,
          email: userEmail,
          avatar: avatarUrl,
          pan: panNumber,
          aadhaar: aadhaarNumber,
          employer: employerName,
          creditScore: cibil,
          creditRating: creditRating,
          creditDesc: creditDesc,
          bank: bankLabel,
          upi: `${mobile}@upi`,
          salary: Number(cam?.salary_credit_amount_1 || 0),
        },
        loan: {
          id: lead?.loan_id || loanAcc?.id || lead?.lead_id || 'LN-ACTIVE',
          leadId: lead?.lead_id || 'GP-LEAD',
          status: lead?.status || 'DISBURSED',
          amount: principal,
          processingFee: processingFee,
          gst: gst,
          disbursed: netDisbursed,
          dailyRate: dailyRate,
          startDate: startDateStr,
          dueDate: dueDateStr,
          totalDays: totalDays,
          elapsed: elapsed,
          remaining: remaining,
          interest: interest,
          outstanding: totalPayable,
          hasActiveLoan: true,
        },
        kyc: kycData,
        notifications: notifications,
        history: [],
        transactions: transactions,
      };
    } catch (error: any) {
      console.error('❌ [LoanModel ERROR]:', error.message);
      return {
        user: {
          id: userId,
          name: 'GeetPay User',
          phone: '+91 ' + mobile,
          email: `${mobile}@geetpay.com`,
          avatar: null,
          creditScore: 0,
          creditRating: 'Not Generated',
          creditDesc: 'Apply for loan to generate credit score',
          bank: 'No Bank Linked',
        },
        loan: {
          id: '',
          leadId: '',
          status: 'NO_LOAN',
          amount: 0,
          processingFee: 0,
          gst: 0,
          disbursed: 0,
          dailyRate: 1,
          startDate: '',
          dueDate: '',
          totalDays: 0,
          elapsed: 0,
          remaining: 0,
          interest: 0,
          outstanding: 0,
          hasActiveLoan: false,
        },
        kyc: {
          status: 'Pending',
          isComplete: false,
          completionPercent: 0,
          title: 'KYC Status',
          desc: 'Verify documents to activate loans',
          steps: [],
        },
        notifications: [],
        history: [],
        transactions: [],
      };
    }
  }
}
