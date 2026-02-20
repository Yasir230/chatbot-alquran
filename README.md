# Chatbot Al-Quran

Aplikasi chatbot berbasis AI yang menjawab pertanyaan seputar Islam dengan referensi Al-Quran dan Hadits.

## Fitur Utama

- **Chat dengan AI**: Menggunakan OpenAI GPT-4o-mini dengan RAG (Retrieval Augmented Generation) untuk memberikan jawaban akurat berdasarkan Al-Quran.
- **Pencarian Al-Quran**: Cari ayat berdasarkan kata kunci (Indonesia).
- **Integrasi Equran.id**: Menggunakan API Equran.id untuk data Al-Quran yang valid.
- **Real-time Chat**: Menggunakan Socket.IO untuk komunikasi real-time.
- **Manajemen Percakapan**: Simpan riwayat percakapan.

## Persiapan Lingkungan (Environment Setup)

### 1. Database (PostgreSQL via Neon.tech)

Karena kita tidak menggunakan Docker, kita akan menggunakan layanan PostgreSQL cloud gratis dari [Neon.tech](https://neon.tech).

1. Buat akun di [Neon.tech](https://neon.tech).
2. Buat project baru.
3. Salin **Connection String** (pilih opsi "Pooled connection" jika ada).
   Format: `postgresql://user:password@host:port/dbname?sslmode=require`

### 2. OpenAI API Key

1. Daftar/Login di [platform.openai.com](https://platform.openai.com).
2. Buat API Key baru di menu **API Keys**.
3. Pastikan akun memiliki saldo kredit (credit balance).

### 3. Konfigurasi .env

Salin file `.env.example` menjadi `.env` di folder `backend` dan `frontend`.

**Backend (.env):**
```bash
DATABASE_URL=postgresql://[USER]:[PASSWORD]@[HOST]/[DBNAME]?sslmode=require
JWT_SECRET=rahasia_super_aman_ganti_ini
OPENAI_API_KEY=sk-[YOUR_OPENAI_KEY]
NODE_ENV=development
PORT=3001
EQURAN_API_URL=https://equran.id/api/v2
```

**Frontend (.env):**
(Biasanya tidak perlu jika default localhost:3001, tapi bisa diset jika perlu)

## Instalasi dan Menjalankan Aplikasi

1. **Install Dependencies:**
   ```bash
   # Di root folder
   npm install
   
   # Install backend dependencies
   cd backend && npm install
   
   # Install frontend dependencies
   cd ../frontend && npm install
   ```

2. **Setup Database (Migrate & Seed):**
   Pastikan `backend/.env` sudah terisi dengan benar.
   ```bash
   # Kembali ke root
   cd ..
   
   # Jalankan migrasi database
   npm run migrate
   
   # (Opsional) Jalankan seed data awal
   npm run seed
   ```

3. **Jalankan Aplikasi (Development Mode):**
   ```bash
   # Dari root folder
   npm run dev
   ```
   
   - Frontend akan berjalan di: http://localhost:5173
   - Backend akan berjalan di: http://localhost:3001

## Struktur Project (Monorepo)

- `backend/`: Express.js server, API routes, database logic.
- `frontend/`: React + Vite application, Tailwind CSS.
- `shared/`: Tipe data TypeScript yang digunakan bersama (backend & frontend).

## Troubleshooting

- **Error: `gen_random_uuid()` does not exist**: Pastikan migrasi berhasil dijalankan. Script migrasi akan otomatis mengaktifkan ekstensi `pgcrypto`.
- **Error: Connection refused**: Pastikan koneksi internet stabil dan connection string Neon.tech benar.
