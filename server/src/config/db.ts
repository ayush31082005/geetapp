import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbHost = process.env.DB_HOST || '193.203.184.216';
const dbPort = parseInt(process.env.DB_PORT || '3306', 10);
const dbUser = process.env.DB_USER || 'u368199755_crmpaday';
const dbPassword = process.env.DB_PASSWORD || 'Support@@12345@@';
const dbName = process.env.DB_NAME || 'u368199755_crmpaday';

export const pool = mysql.createPool({
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
});

export async function initDatabase() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ [DATABASE] Connected successfully to MySQL Database:', dbName);

    // Create otps table if not exists for audit log
    await connection.query(`
      CREATE TABLE IF NOT EXISTS otps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        mobile VARCHAR(20) NOT NULL,
        otp VARCHAR(10) NOT NULL,
        expires_at DATETIME NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_mobile_otp (mobile, otp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    connection.release();
  } catch (error: any) {
    console.error('❌ [DATABASE ERROR] Failed to connect or initialize MySQL:', error.message);
  }
}
