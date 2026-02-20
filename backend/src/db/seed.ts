import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { pool } from "./database";

dotenv.config();

async function seed() {
  const passwordHash = await bcrypt.hash("admin123", 10);
  await pool.query(
    `
    insert into users (email, username, password_hash)
    values ($1, $2, $3)
    on conflict (email) do nothing
  `,
    ["admin@example.com", "admin", passwordHash]
  );
  console.log("Seed completed");
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

