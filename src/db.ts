import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'livejukebox',
  port: parseInt(process.env.DB_PORT || '3306'),
};

export const pool = mysql.createPool(dbConfig);

// Test connection
pool.getConnection().then(() => {
  console.log('✅ Connected to MySQL database');
}).catch(err => {
  console.error('❌ MySQL connection error:', err);
});

export default pool;
