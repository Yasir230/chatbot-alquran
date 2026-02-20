import { pool } from "./database";

async function reset() {
  console.log("Dropping all tables...");
  try {
    await pool.query(`
      DROP TABLE IF EXISTS messages CASCADE;
      DROP TABLE IF EXISTS conversations CASCADE;
      DROP TABLE IF EXISTS bookmarks CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
    console.log("All tables dropped successfully.");
  } catch (error) {
    console.error("Error dropping tables:", error);
  } finally {
    await pool.end();
  }
}

reset();
