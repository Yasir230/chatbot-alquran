import { pool } from "../db/database";
import { embeddingService } from "./embeddingService";
import { mockDb } from "../db/mockDatabase";
import { getMockSimilarVerses } from "./mockData";

interface MemorizationSession {
  sessionId: string;
  userId: string;
  currentSurah: number;
  currentAyat: number;
  mode: 'forward' | 'backward' | 'random';
  difficulty: 'easy' | 'medium' | 'hard';
  score: number;
  totalAttempts: number;
  correctAttempts: number;
  lastAttempt: Date;
}

interface MemorizationAttempt {
  sessionId: string;
  surahNumber: number;
  ayatNumber: number;
  userInput: string;
  isCorrect: boolean;
  similarityScore: number;
  hintsUsed: number;
}

/**
 * Service untuk mode hafalan Al-Quran
 * Membantu user menghafal ayat dengan berbagai mode dan evaluasi
 */
export class HafalanModeService {
  private static instance: HafalanModeService;
  private activeSessions: Map<string, MemorizationSession> = new Map();

  private constructor() {}

  public static getInstance(): HafalanModeService {
    if (!HafalanModeService.instance) {
      HafalanModeService.instance = new HafalanModeService();
    }
    return HafalanModeService.instance;
  }

  /**
   * Mulai session hafalan baru
   */
  async startMemorizationSession(
    userId: string, 
    startSurah: number = 1, 
    startAyat: number = 1,
    mode: 'forward' | 'backward' | 'random' = 'forward',
    difficulty: 'easy' | 'medium' | 'hard' = 'medium'
  ): Promise<MemorizationSession> {
    try {
      let sessionId = `hafalan_${userId}_${Date.now()}`;
      
      const session: MemorizationSession = {
        sessionId,
        userId,
        currentSurah: startSurah,
        currentAyat: startAyat,
        mode,
        difficulty,
        score: 0,
        totalAttempts: 0,
        correctAttempts: 0,
        lastAttempt: new Date()
      };

      this.activeSessions.set(sessionId, session);

      // Simpan ke database atau mock database
      if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
        // Gunakan mock database untuk menyimpan session
        const mockSession = await mockDb.createMemorizationSession(userId, startSurah, startAyat, mode, difficulty);
        sessionId = mockSession.id; // Gunakan ID dari mock database
      } else {
        // Simpan ke database asli
        await pool.query(`
          INSERT INTO memorization_sessions (id, user_id, current_surah, current_ayat, mode, difficulty)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [sessionId, userId, startSurah, startAyat, mode, difficulty]);
      }

      return session;

    } catch (error) {
      console.error("Error starting memorization session:", error);
      throw new Error("Gagal memulai session hafalan");
    }
  }

  /**
   * Dapatkan ayat berikutnya untuk dihafal
   */
  async getNextVerse(sessionId: string): Promise<{
    surahNumber: number;
    ayatNumber: number;
    arabicText: string;
    translation: string;
    hint?: string;
  }> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error("Session tidak ditemukan");
      }

      // Ambil ayat berdasarkan mode
      let nextSurah = session.currentSurah;
      let nextAyat = session.currentAyat;

      switch (session.mode) {
        case 'forward':
          nextAyat++;
          break;
        case 'backward':
          nextAyat--;
          break;
        case 'random':
          // Pilih ayat random dari surah yang sama
          const verseCount = await this.getVerseCount(session.currentSurah);
          nextAyat = Math.floor(Math.random() * verseCount) + 1;
          break;
      }

      // Validasi batas ayat
      const verseCount = await this.getVerseCount(nextSurah);
      if (nextAyat > verseCount) {
        nextSurah++;
        nextAyat = 1;
      } else if (nextAyat < 1) {
        nextSurah--;
        if (nextSurah < 1) nextSurah = 1;
        nextAyat = await this.getVerseCount(nextSurah);
      }

      // Ambil data ayat dari database atau mock data
      let verse;
      if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
        // Gunakan mock data
        const mockVerses = getMockSimilarVerses(`surah ${nextSurah} ayat ${nextAyat}`, 10);
        verse = mockVerses.find(v => v.surahNumber === nextSurah && v.ayatNumber === nextAyat);
        
        if (!verse) {
          throw new Error(`Ayat ${nextSurah}:${nextAyat} tidak ditemukan`);
        }
        
        // Konversi ke format yang sama dengan database
        verse = {
          surah_number: verse.surahNumber,
          ayat_number: verse.ayatNumber,
          arabic_text: verse.arabicText,
          indonesian_translation: verse.indonesianTranslation,
          surah_name_latin: `Surah ${verse.surahNumber}`
        };
      } else {
        // Ambil dari database
        const verseResult = await pool.query(`
          SELECT * FROM quran_verses 
          WHERE surah_number = $1 AND ayat_number = $2
          LIMIT 1
        `, [nextSurah, nextAyat]);

        if (verseResult.rows.length === 0) {
          throw new Error(`Ayat ${nextSurah}:${nextAyat} tidak ditemukan`);
        }

        verse = verseResult.rows[0];
      }
      
      // Generate hint berdasarkan difficulty
      let hint: string | undefined;
      if (session.difficulty === 'easy') {
        hint = `Surah ${verse.surah_name_latin}, ayat ke-${nextAyat}`;
      } else if (session.difficulty === 'medium') {
        hint = `Surah ${verse.surah_name_latin}`;
      }

      // Update session
      session.currentSurah = nextSurah;
      session.currentAyat = nextAyat;
      this.activeSessions.set(sessionId, session);

      // Update database atau mock database
      if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
        // Update mock database
        await mockDb.updateMemorizationSession(sessionId, { current_surah: nextSurah, current_ayat: nextAyat });
      } else {
        // Update database asli
        await pool.query(`
          UPDATE memorization_sessions 
          SET current_surah = $1, current_ayat = $2 
          WHERE id = $3
        `, [nextSurah, nextAyat, sessionId]);
      }

      return {
        surahNumber: nextSurah,
        ayatNumber: nextAyat,
        arabicText: verse.arabic_text,
        translation: verse.indonesian_translation,
        hint
      };

    } catch (error) {
      console.error("Error getting next verse:", error);
      throw new Error("Gagal mendapatkan ayat berikutnya");
    }
  }

  /**
   * Evaluasi hafalan user
   */
  async evaluateMemorization(
    sessionId: string, 
    userInput: string, 
    surahNumber: number, 
    ayatNumber: number
  ): Promise<{
    isCorrect: boolean;
    similarityScore: number;
    feedback: string;
    correctText: string;
    nextVerse?: {
      surahNumber: number;
      ayatNumber: number;
      arabicText: string;
      translation: string;
    };
  }> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error("Session tidak ditemukan");
      }

      // Ambil ayat yang benar dari database atau mock data
      let correctVerse;
      let correctText;
      
      if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
        // Gunakan mock data
        const mockVerses = getMockSimilarVerses(`surah ${surahNumber} ayat ${ayatNumber}`, 10);
        const verse = mockVerses.find(v => v.surahNumber === surahNumber && v.ayatNumber === ayatNumber);
        
        if (!verse) {
          throw new Error(`Ayat ${surahNumber}:${ayatNumber} tidak ditemukan`);
        }
        
        correctText = verse.arabicText;
        correctVerse = {
          surah_number: verse.surahNumber,
          ayat_number: verse.ayatNumber,
          arabic_text: verse.arabicText,
          indonesian_translation: verse.indonesianTranslation
        };
      } else {
        // Ambil dari database
        const verseResult = await pool.query(`
          SELECT * FROM quran_verses 
          WHERE surah_number = $1 AND ayat_number = $2
          LIMIT 1
        `, [surahNumber, ayatNumber]);

        if (verseResult.rows.length === 0) {
          throw new Error(`Ayat ${surahNumber}:${ayatNumber} tidak ditemukan`);
        }

        correctVerse = verseResult.rows[0];
        correctText = correctVerse.arabic_text;
      }

      // Hitung similarity score
      const similarityScore = this.calculateSimilarity(userInput, correctText);

      // Tentukan threshold berdasarkan difficulty
      let threshold = 0.8;
      if (session.difficulty === 'easy') threshold = 0.7;
      else if (session.difficulty === 'hard') threshold = 0.9;

      const isCorrect = similarityScore >= threshold;

      // Update statistik session
      session.totalAttempts++;
      if (isCorrect) session.correctAttempts++;
      session.score += similarityScore;
      session.lastAttempt = new Date();
      this.activeSessions.set(sessionId, session);

      // Simpan attempt ke database atau mock database
      if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
        // Simpan ke mock database
        await mockDb.createMemorizationAttempt(sessionId, surahNumber, ayatNumber, userInput, isCorrect, similarityScore, 0);
      } else {
        // Simpan ke database asli
        await pool.query(`
          INSERT INTO memorization_attempts (session_id, surah_number, ayat_number, user_input, is_correct, similarity_score)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [sessionId, surahNumber, ayatNumber, userInput, isCorrect, similarityScore]);
      }

      // Generate feedback
      let feedback: string;
      if (isCorrect) {
        if (similarityScore >= 0.95) {
          feedback = "Sempurna! Hafalan Anda sangat akurat.";
        } else if (similarityScore >= 0.9) {
          feedback = "Bagus! Hafalan Anda sudah sangat baik.";
        } else {
          feedback = "Benar! Hafalan Anda sudah cukup baik.";
        }
      } else {
        if (similarityScore >= 0.6) {
          feedback = "Hampir benar! Perhatikan beberapa kata kunci.";
        } else if (similarityScore >= 0.4) {
          feedback = "Belum tepat. Coba perhatikan struktur ayatnya.";
        } else {
          feedback = "Belum benar. Silakan coba lagi dengan lebih teliti.";
        }
      }

      // Siapkan next verse jika benar
      let nextVerse;
      if (isCorrect) {
        try {
          const nextVerseData = await this.getNextVerse(sessionId);
          nextVerse = {
            surahNumber: nextVerseData.surahNumber,
            ayatNumber: nextVerseData.ayatNumber,
            arabicText: nextVerseData.arabicText,
            translation: nextVerseData.translation
          };
        } catch (error) {
          console.warn("Could not get next verse:", error);
        }
      }

      return {
        isCorrect,
        similarityScore,
        feedback,
        correctText,
        nextVerse
      };

    } catch (error) {
      console.error("Error evaluating memorization:", error);
      throw new Error("Gagal mengevaluasi hafalan");
    }
  }

  /**
   * Hitung similarity score antara input user dan teks yang benar
   */
  private calculateSimilarity(userInput: string, correctText: string): number {
    // Normalisasi teks
    const normalize = (text: string) => {
      return text
        .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // Hapus tanda-tanda harakat
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    };

    const normalizedInput = normalize(userInput);
    const normalizedCorrect = normalize(correctText);

    // Hitung Levenshtein distance
    const distance = this.levenshteinDistance(normalizedInput, normalizedCorrect);
    const maxLength = Math.max(normalizedInput.length, normalizedCorrect.length);
    
    // Convert to similarity score (0-1)
    return Math.max(0, 1 - (distance / maxLength));
  }

  /**
   * Levenshtein distance untuk string comparison
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Dapatkan jumlah ayat dalam surah
   */
  private async getVerseCount(surahNumber: number): Promise<number> {
    try {
      if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
        // Gunakan mock data untuk menghitung jumlah ayat
        const mockVerses = getMockSimilarVerses(`surah ${surahNumber}`, 100);
        return mockVerses.filter(v => v.surahNumber === surahNumber).length;
      } else {
        // Query database asli
        const result = await pool.query(`
          SELECT COUNT(*) as count FROM quran_verses 
          WHERE surah_number = $1
        `, [surahNumber]);

        return parseInt(result.rows[0].count);
      }
    } catch (error) {
      console.error("Error getting verse count:", error);
      // Fallback ke jumlah ayat yang umum
      const verseCounts: {[key: number]: number} = {
        1: 7, 2: 286, 3: 200, 4: 176, 5: 120, 6: 165, 7: 206, 8: 75, 9: 129, 10: 109,
        11: 123, 12: 111, 13: 43, 14: 52, 15: 99, 16: 128, 17: 111, 18: 110, 19: 98, 20: 135,
        21: 112, 22: 78, 23: 118, 24: 64, 25: 77, 26: 227, 27: 93, 28: 88, 29: 69, 30: 60,
        31: 34, 32: 30, 33: 73, 34: 54, 35: 45, 36: 83, 37: 182, 38: 88, 39: 75, 40: 85,
        41: 54, 42: 53, 43: 89, 44: 59, 45: 37, 46: 35, 47: 38, 48: 29, 49: 18, 50: 45,
        51: 60, 52: 49, 53: 62, 54: 55, 55: 78, 56: 96, 57: 29, 58: 22, 59: 24, 60: 13,
        61: 14, 62: 11, 63: 11, 64: 18, 65: 12, 66: 12, 67: 30, 68: 52, 69: 52, 70: 44,
        71: 28, 72: 28, 73: 20, 74: 56, 75: 40, 76: 31, 77: 50, 78: 40, 79: 46, 80: 42,
        81: 29, 82: 19, 83: 36, 84: 25, 85: 22, 86: 17, 87: 19, 88: 26, 89: 30, 90: 20,
        91: 15, 92: 21, 93: 11, 94: 8, 95: 8, 96: 19, 97: 5, 98: 8, 99: 8, 100: 11,
        101: 11, 102: 8, 103: 3, 104: 9, 105: 5, 106: 4, 107: 7, 108: 3, 109: 6, 110: 3,
        111: 5, 112: 4, 113: 5, 114: 6
      };
      
      return verseCounts[surahNumber] || 100;
    }
  }

  /**
   * Dapatkan statistik session
   */
  async getSessionStats(sessionId: string): Promise<{
    totalAttempts: number;
    correctAttempts: number;
    accuracy: number;
    averageScore: number;
    currentProgress: number;
  }> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error("Session tidak ditemukan");
      }

      const accuracy = session.totalAttempts > 0 ? 
        (session.correctAttempts / session.totalAttempts) * 100 : 0;
      
      const averageScore = session.totalAttempts > 0 ? 
        session.score / session.totalAttempts : 0;

      // Hitung progress (misalnya berdasarkan ayat yang sudah dicoba)
      let uniqueVerses = 0;
      
      if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
        // Gunakan mock database untuk menghitung progress
        const attempts = await mockDb.getMemorizationAttempts(sessionId);
        const uniqueAyat = new Set(attempts.map(a => `${a.surah_number}:${a.ayat_number}`));
        uniqueVerses = uniqueAyat.size;
      } else {
        // Query database asli
        const attemptsResult = await pool.query(`
          SELECT COUNT(DISTINCT ayat_number) as unique_verses
          FROM memorization_attempts 
          WHERE session_id = $1
        `, [sessionId]);
        
        uniqueVerses = parseInt(attemptsResult.rows[0].unique_verses);
      }
      
      const currentProgress = Math.min(uniqueVerses * 10, 100); // Asumsi 10 ayat = 100%

      return {
        totalAttempts: session.totalAttempts,
        correctAttempts: session.correctAttempts,
        accuracy,
        averageScore,
        currentProgress
      };

    } catch (error) {
      console.error("Error getting session stats:", error);
      throw new Error("Gagal mendapatkan statistik session");
    }
  }

  /**
   * Akhiri session hafalan
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error("Session tidak ditemukan");
      }

      // Update final stats di database atau mock database
      if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
        // Update mock database
        await mockDb.updateMemorizationSession(sessionId, { 
          total_attempts: session.totalAttempts, 
          correct_attempts: session.correctAttempts, 
          final_score: session.score,
          ended_at: new Date()
        });
      } else {
        // Update database asli
        await pool.query(`
          UPDATE memorization_sessions 
          SET ended_at = NOW(),
              total_attempts = $1,
              correct_attempts = $2,
              final_score = $3
          WHERE id = $4
        `, [session.totalAttempts, session.correctAttempts, session.score, sessionId]);
      }

      // Hapus dari active sessions
      this.activeSessions.delete(sessionId);

    } catch (error) {
      console.error("Error ending session:", error);
      throw new Error("Gagal mengakhiri session");
    }
  }

  /**
   * Cek apakah pesan user adalah untuk mode hafalan
   */
  isMemorizationMessage(message: string): boolean {
    const hafalanKeywords = [
      'hafal', 'hafalan', 'menghafal', 'mengaji', 'tilawah',
      'lanjutkan ayat', 'ayat berikutnya', 'teks arab', 'teks arabnya'
    ];

    const lowerMessage = message.toLowerCase();
    
    return hafalanKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Cek apakah user sedang mencoba menghafal (input awal ayat)
   */
  isMemorizationAttempt(message: string): boolean {
    // Cek apakah ada karakter Arab atau transliterasi
    const arabicPattern = /[\u0600-\u06FF]/;
    const hasArabic = arabicPattern.test(message);
    
    // Cek panjang pesan (biasanya ayat Al-Quran cukup panjang)
    const isLongEnough = message.length > 10;
    
    return hasArabic && isLongEnough;
  }
}

export const hafalanModeService = HafalanModeService.getInstance();