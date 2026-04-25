import { db } from "../server/db";
import { priceHistory } from "../shared/schema";

async function run() {
  const result = await db.delete(priceHistory);
  console.log(`Deleted price_history records.`);
  process.exit(0);
}
run().catch(console.error);
