import { db } from "../server/db";
import { positions } from "../shared/schema";
import { eq } from "drizzle-orm";

async function run() {
  const data = await db.select().from(positions).where(eq(positions.symbol, 'MAVI'));
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}
run().catch(console.error);
