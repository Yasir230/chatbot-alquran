import { pool } from "./database";

async function migrate() {
  await pool.query(`
    -- Enable required extensions
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    
    -- Users table
    create table if not exists users (
      id uuid primary key default gen_random_uuid(),
      email text unique not null,
      username text unique not null,
      password_hash text not null,
      created_at timestamptz not null default now()
    );

    -- Conversations table
    create table if not exists conversations (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      title text not null,
      created_at timestamptz not null default now()
    );

    -- Messages table
    create table if not exists messages (
      id uuid primary key default gen_random_uuid(),
      conversation_id uuid not null references conversations(id) on delete cascade,
      role text not null check (role in ('user','assistant')),
      content text not null,
      sources jsonb,
      created_at timestamptz not null default now()
    );

    -- Bookmarks table
    create table if not exists bookmarks (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      surah integer not null,
      ayat integer not null,
      note text,
      created_at timestamptz not null default now()
    );

    -- Memorization sessions table
    create table if not exists memorization_sessions (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      current_surah integer not null default 1,
      current_ayat integer not null default 1,
      mode text not null default 'forward',
      difficulty text not null default 'medium',
      score numeric default 0,
      total_attempts integer default 0,
      correct_attempts integer default 0,
      started_at timestamptz not null default now(),
      ended_at timestamptz
    );

    -- Memorization attempts table
    create table if not exists memorization_attempts (
      id uuid primary key default gen_random_uuid(),
      session_id uuid not null references memorization_sessions(id) on delete cascade,
      surah_number integer not null,
      ayat_number integer not null,
      user_input text not null,
      is_correct boolean not null,
      similarity_score numeric not null,
      hints_used integer default 0,
      attempt_time timestamptz not null default now()
    );

    -- Quran verses table (for local storage)
    create table if not exists quran_verses (
      id uuid primary key default gen_random_uuid(),
      surah_number integer not null,
      ayat_number integer not null,
      arabic_text text not null,
      indonesian_translation text,
      tafsir_summary text,
      themes text[],
      context_before text,
      context_after text,
      embedding vector(1536),
      created_at timestamptz not null default now()
    );

    -- Conversation context table (for RAG)
    create table if not exists conversation_context (
      id uuid primary key default gen_random_uuid(),
      conversation_id uuid not null references conversations(id) on delete cascade,
      surah_number integer not null,
      ayat_number integer not null,
      relevance_score numeric default 0.8,
      created_at timestamptz not null default now()
    );

    -- === INDEXES FOR PERFORMANCE ===
    
    -- User indexes
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

    -- Conversation indexes
    CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);

    -- Message indexes
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);

    -- Bookmark indexes
    CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_surah_ayat ON bookmarks(surah, ayat);

    -- Memorization indexes
    CREATE INDEX IF NOT EXISTS idx_memorization_sessions_user_id ON memorization_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_memorization_sessions_started ON memorization_sessions(started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_memorization_attempts_session_id ON memorization_attempts(session_id);

    -- Quran verses indexes (critical for search)
    CREATE INDEX IF NOT EXISTS idx_quran_verses_surah_ayat ON quran_verses(surah_number, ayat_number);
    CREATE INDEX IF NOT EXISTS idx_quran_verses_search ON quran_verses USING gin(to_tsvector('indonesian', indonesian_translation));

    -- Conversation context indexes
    CREATE INDEX IF NOT EXISTS idx_conversation_context_conversation_id ON conversation_context(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_context_relevance ON conversation_context(relevance_score DESC);
  `);

  console.log("Migration completed with indexes");
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
