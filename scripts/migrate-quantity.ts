import { pool } from '../server/db';

async function migrate() {
  console.log('Starting safe quantity migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Converting positions.quantity to numeric(20, 10)...');
    await client.query('ALTER TABLE positions ALTER COLUMN quantity TYPE numeric(20, 10) USING quantity::numeric');
    
    console.log('Converting closed_positions.quantity to numeric(20, 10)...');
    await client.query('ALTER TABLE closed_positions ALTER COLUMN quantity TYPE numeric(20, 10) USING quantity::numeric');
    
    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.log('Migration failed, rolled back changes.');
    console.error(err);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();
