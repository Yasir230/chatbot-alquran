import { pool } from "./database";

async function migrateEmbeddings() {
  try {
    // Buat tabel untuk ayat dengan embeddings
    await pool.query(`
      -- Extension untuk vector similarity
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "vector";
      
      -- Tabel untuk ayat Al-Quran dengan embeddings
      CREATE TABLE IF NOT EXISTS quran_verses (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        surah_number INTEGER NOT NULL,
        surah_name_latin TEXT NOT NULL,
        surah_name_arabic TEXT NOT NULL,
        ayat_number INTEGER NOT NULL,
        arabic_text TEXT NOT NULL,
        indonesian_translation TEXT NOT NULL,
        context_before TEXT,
        context_after TEXT,
        tafsir_summary TEXT,
        themes TEXT[], -- Array tema/topic
        embedding VECTOR(1536), -- OpenAI embedding dimension
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(surah_number, ayat_number)
      );

      -- Index untuk pencarian cepat
      CREATE INDEX IF NOT EXISTS idx_quran_verses_surah ON quran_verses(surah_number);
      CREATE INDEX IF NOT EXISTS idx_quran_verses_ayat ON quran_verses(ayat_number);
      CREATE INDEX IF NOT EXISTS idx_quran_verses_themes ON quran_verses USING GIN(themes);
      
      -- Function untuk update updated_at
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Trigger untuk updated_at
      DROP TRIGGER IF EXISTS update_quran_verses_updated_at ON quran_verses;
      CREATE TRIGGER update_quran_verses_updated_at
        BEFORE UPDATE ON quran_verses
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      -- Tabel untuk menyimpan conversation context
      CREATE TABLE IF NOT EXISTS conversation_context (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        verse_ids uuid[] NOT NULL, -- Array of quran_verses.id yang sudah dibahas
        themes_discussed TEXT[], -- Tema yang sudah dibahas
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Index untuk conversation context
      CREATE INDEX IF NOT EXISTS idx_conversation_context_conversation ON conversation_context(conversation_id);
      
      -- Trigger untuk updated_at di conversation_context
      DROP TRIGGER IF EXISTS update_conversation_context_updated_at ON conversation_context;
      CREATE TRIGGER update_conversation_context_updated_at
        BEFORE UPDATE ON conversation_context
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      -- Tabel untuk memorization sessions
      CREATE TABLE IF NOT EXISTS memorization_sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        current_surah INTEGER NOT NULL,
        current_ayat INTEGER NOT NULL,
        mode VARCHAR(20) NOT NULL DEFAULT 'forward', -- forward, backward, random
        difficulty VARCHAR(20) NOT NULL DEFAULT 'medium', -- easy, medium, hard
        total_attempts INTEGER DEFAULT 0,
        correct_attempts INTEGER DEFAULT 0,
        final_score FLOAT DEFAULT 0,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        ended_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Tabel untuk memorization attempts
      CREATE TABLE IF NOT EXISTS memorization_attempts (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        session_id VARCHAR(255) NOT NULL REFERENCES memorization_sessions(id) ON DELETE CASCADE,
        surah_number INTEGER NOT NULL,
        ayat_number INTEGER NOT NULL,
        user_input TEXT NOT NULL,
        is_correct BOOLEAN NOT NULL,
        similarity_score FLOAT NOT NULL,
        hints_used INTEGER DEFAULT 0,
        attempt_time TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Index untuk memorization tables
      CREATE INDEX IF NOT EXISTS idx_memorization_sessions_user ON memorization_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_memorization_sessions_started ON memorization_sessions(started_at);
      CREATE INDEX IF NOT EXISTS idx_memorization_attempts_session ON memorization_attempts(session_id);
      CREATE INDEX IF NOT EXISTS idx_memorization_attempts_surah_ayat ON memorization_attempts(surah_number, ayat_number);

      -- Trigger untuk updated_at di memorization_sessions
      DROP TRIGGER IF EXISTS update_memorization_sessions_updated_at ON memorization_sessions;
      CREATE TRIGGER update_memorization_sessions_updated_at
        BEFORE UPDATE ON memorization_sessions
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log("✅ Migration embeddings completed");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Jalankan migration jika file ini dijalankan langsung
if (require.main === module) {
  migrateEmbeddings().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { migrateEmbeddings };