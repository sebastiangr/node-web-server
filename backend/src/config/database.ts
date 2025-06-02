import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') }); // .env is in backend/

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
  console.log('Backend connected to PostgreSQL database successfully (Dockerized).');
});

pool.on('error', (err) => {
  console.error('Error connecting to PostgreSQL database.', err);
  // process.exit(-1);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

// Check DB Connection status
export const checkDbConnection = async () => {
  try {
    await pool.query('SELECT NOW()'); // Simple query for testing purposes
    console.log('Query PostgreSQL test succesful.');
    
    // Verify if the 'videos' table exists
    const tableCheck = await pool.query("SELECT to_regclass('public.videos');");
    if (tableCheck.rows[0].to_regclass) {
      console.log("Table 'videos' exists in the database.");      
    } else {
      console.warn("Table 'videos' does NOT exist in the database. Check db_init.sql.");      
    }    
  } catch (err) {
    console.error("Error checking database connection:", err);
  }
};