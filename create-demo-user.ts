import "dotenv/config";
import { db } from "./server/db";
import { users } from "./shared/schema";

async function run() {
  try {
    await db.insert(users).values({
      id: "demo-user",
      username: "demo-user",
      password: "password"
    }).onConflictDoNothing();
    console.log("Demo user successfully created in the new database.");
  } catch (error) {
    console.error("Error creating demo user:", error);
  } finally {
    process.exit(0);
  }
}

run();
