@echo off
echo ========================================
echo   CHATBOT AL-QURAN - Starting Dev Server
echo ========================================
echo.
echo [1/2] Starting Backend on port 3001...
echo [2/2] Starting Frontend on port 5173...
echo.
echo PENTING: Pastikan backend/.env sudah diisi!
echo   - DATABASE_URL dari Neon.tech
echo   - OPENAI_API_KEY dari OpenAI
echo.
cd /d e:\Cursor\Yasir\chatbot-alquran
npm run dev
