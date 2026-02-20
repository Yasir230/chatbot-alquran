import { pool } from "../src/db/database";
import { quranDataService } from "../src/services/quranDataService";

async function setupEmbeddings() {
  try {
    console.log("🚀 Setting up embeddings database...");
    
    // 1. Pastikan pgvector extension tersedia
    await pool.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log("✅ pgvector extension ready");
    
    // 2. Jalankan migration untuk embeddings tables
    const { migrateEmbeddings } = await import("../src/db/migrate_embeddings");
    await migrateEmbeddings();
    console.log("✅ Embeddings tables created");
    
    // 3. Populate Quran data dengan embeddings
    console.log("📖 Populating Quran data with embeddings...");
    await quranDataService.populateQuranData();
    console.log("✅ Quran data populated with embeddings");
    
    console.log("🎉 Setup embeddings completed!");
    
  } catch (error) {
    console.error("❌ Setup embeddings failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Jalankan jika dipanggil langsung
if (require.main === module) {
  setupEmbeddings().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { setupEmbeddings };