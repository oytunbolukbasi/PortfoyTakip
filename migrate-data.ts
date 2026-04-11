import pg from 'pg';
const { Pool } = pg;

const oldDbUrl = process.env.OLD_DATABASE_URL;
const newDbUrl = process.env.DATABASE_URL;

if (!oldDbUrl || !newDbUrl) {
  throw new Error("Missing OLD_DATABASE_URL or DATABASE_URL");
}

const oldPool = new Pool({ connectionString: oldDbUrl });
const newPool = new Pool({ connectionString: newDbUrl });

const tables = ['users', 'positions', 'closed_positions', 'price_history', 'bist_symbols'];

async function migrate() {
  for (const table of tables) {
    console.log(`\nMigrating table: ${table}...`);
    try {
      const { rows } = await oldPool.query(`SELECT * FROM ${table}`);
      console.log(`Found ${rows.length} rows in ${table}`);
      
      if (rows.length > 0) {
        const cols = Object.keys(rows[0]);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
        const colsString = cols.map(c => `"${c}"`).join(', ');

        const queryText = `INSERT INTO ${table} (${colsString}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const row of rows) {
          const values = cols.map(c => row[c]);
          try {
            await newPool.query(queryText, values);
            successCount++;
          } catch (e) {
            errorCount++;
            console.error(`Row insert error on ${table}:`, e.message);
          }
        }
        console.log(`Finished migrating ${table} - Success: ${successCount}, Failed/Conflict: ${errorCount}`);
      }
    } catch (e) {
      console.error(`Failed to process table ${table}:`, e.message);
    }
  }
  
  console.log("\nMigration completed.");
  process.exit(0);
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
