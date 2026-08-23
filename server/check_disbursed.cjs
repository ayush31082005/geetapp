const mysql = require('mysql2/promise');

async function checkDisbursed() {
  const conn = await mysql.createConnection('mysql://u368199755_crmpaday:Support@@12345@@@193.203.184.216:3306/u368199755_crmpaday');
  
  // 1. Check leads with DISBURSED status or disbursement records
  const [disbRows] = await conn.query(`
    SELECT 
      l.id AS lead_id_pk,
      l.user_id,
      l.lead_id,
      l.loan_id,
      l.loan_applied,
      l.status AS lead_status,
      u.mobile_number,
      p.full_name,
      d.amount AS disbursed_amount,
      d.disbursed_at,
      c.loan_approved,
      c.net_disbursed_amount,
      c.total_amount_payable
    FROM leads l
    LEFT JOIN users u ON l.user_id = u.id
    LEFT JOIN user_profiles p ON l.user_id = p.user_id
    LEFT JOIN disbursements d ON l.user_id = d.user_id
    LEFT JOIN cam_details c ON l.user_id = c.user_id
    WHERE l.status LIKE '%DISBURS%' OR d.id IS NOT NULL OR l.loan_id IS NOT NULL
  `);

  console.log('=== DISBURSED LEADS ===');
  console.table(disbRows);

  // 2. Check all leads to see their statuses
  const [allLeads] = await conn.query(`
    SELECT 
      l.id,
      l.user_id,
      l.lead_id,
      l.loan_id,
      l.status,
      l.loan_applied,
      u.mobile_number,
      p.full_name
    FROM leads l
    LEFT JOIN users u ON l.user_id = u.id
    LEFT JOIN user_profiles p ON l.user_id = p.user_id
    ORDER BY l.id ASC
  `);

  console.log('=== ALL LEADS IN DATABASE ===');
  console.table(allLeads);

  // 3. Check loan_accounts table
  const [loanAccounts] = await conn.query(`
    SELECT id, borrower, phone, principal, outstanding, disbursed_on, due_date, status 
    FROM loan_accounts
  `);
  console.log('=== LOAN ACCOUNTS TABLE ===');
  console.table(loanAccounts);

  // 4. Check disbursements table
  const [disbursementsTable] = await conn.query(`
    SELECT d.*, u.mobile_number, p.full_name 
    FROM disbursements d
    LEFT JOIN users u ON d.user_id = u.id
    LEFT JOIN user_profiles p ON d.user_id = p.user_id
  `);
  console.log('=== DISBURSEMENTS TABLE ===');
  console.table(disbursementsTable);

  await conn.end();
}

checkDisbursed().catch(console.error);
