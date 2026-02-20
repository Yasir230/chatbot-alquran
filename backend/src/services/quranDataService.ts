import axios from "axios";
import { embeddingService, VerseEmbedding } from "./embeddingService";
import { pool } from "../db/database";

interface TafsirData {
  teks: string;
  kategori: string;
}

interface QuranVerseData {
  nomor: number;
  nama: string;
  namaLatin: string;
  jumlahAyat: number;
  ayat: Array<{
    nomorAyat: number;
    teksArab: string;
    teksLatin: string;
    teksIndonesia: string;
  }>;
}

export class QuranDataService {
  private static instance: QuranDataService;
  private baseUrl = process.env.EQURAN_API_URL || "https://equran.id/api/v2";
  private tafsirBaseUrl = process.env.TAFSIR_API_URL || "https://equran.id/api/v2";

  private constructor() {}

  public static getInstance(): QuranDataService {
    if (!QuranDataService.instance) {
      QuranDataService.instance = new QuranDataService();
    }
    return QuranDataService.instance;
  }

  /**
   * Pre-populate database dengan ayat Al-Quran dan embeddings
   */
  async populateQuranData(): Promise<void> {
    console.log("🚀 Starting Quran data population...");
    
    try {
      // Ambil daftar surah
      const surahListResponse = await axios.get(`${this.baseUrl}/surat`);
      const surahList = surahListResponse.data.data;
      
      console.log(`📖 Found ${surahList.length} surahs`);
      
      // Proses setiap surah
      for (let i = 0; i < surahList.length; i++) {
        const surahSummary = surahList[i];
        console.log(`Processing Surah ${surahSummary.nomor}: ${surahSummary.namaLatin}`);
        
        try {
          // Ambil detail surah
          const detailResponse = await axios.get(`${this.baseUrl}/surat/${surahSummary.nomor}`);
          const surahData = detailResponse.data.data;
          
          // Ambil tafsir untuk surah ini
          const tafsirData = await this.getTafsirForSurah(surahSummary.nomor);
          
          // Proses setiap ayat
          for (let j = 0; j < surahData.ayat.length; j++) {
            const ayat = surahData.ayat[j];
            const tafsir = tafsirData.find(t => t.ayat === ayat.nomorAyat);
            
            // Buat konteks sebelum dan sesudah
            const contextBefore = j > 0 ? surahData.ayat[j - 1].teksIndonesia : null;
            const contextAfter = j < surahData.ayat.length - 1 ? surahData.ayat[j + 1].teksIndonesia : null;
            
            // Identifikasi tema
            const themes = this.identifyThemes(ayat.teksIndonesia, tafsir?.teks);
            
            // Buat data untuk embedding
            const verseData: Omit<VerseEmbedding, 'id' | 'embedding'> = {
              surahNumber: surahData.nomor,
              surahNameLatin: surahData.namaLatin,
              surahNameArabic: surahData.nama,
              ayatNumber: ayat.nomorAyat,
              arabicText: ayat.teksArab,
              indonesianTranslation: ayat.teksIndonesia,
              contextBefore,
              contextAfter,
              tafsirSummary: tafsir?.teks ? this.summarizeTafsir(tafsir.teks) : undefined,
              themes
            };
            
            // Simpan ke database
            await embeddingService.saveVerse(verseData);
            
            // Delay kecil untuk menghindari rate limit
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          // Delay antar surah
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`Error processing Surah ${surahSummary.nomor}:`, error);
          continue;
        }
      }
      
      console.log("✅ Quran data population completed!");
      
    } catch (error) {
      console.error("❌ Failed to populate Quran data:", error);
      throw error;
    }
  }

  /**
   * Ambil tafsir untuk surah tertentu
   */
  private async getTafsirForSurah(surahNumber: number): Promise<Array<{ayat: number, teks: string}>> {
    try {
      const response = await axios.get(`${this.tafsirBaseUrl}/tafsir/${surahNumber}`);
      const tafsirData = response.data.data;
      
      if (!tafsirData || !tafsirData.tafsir) {
        return [];
      }
      
      return tafsirData.tafsir.map((t: any) => ({
        ayat: t.ayat,
        teks: t.teks
      }));
    } catch (error) {
      console.warn(`Could not fetch tafsir for Surah ${surahNumber}:`, error);
      return [];
    }
  }

  /**
   * Identifikasi tema dari teks ayat dan tafsir
   */
  private identifyThemes(translation: string, tafsir?: string): string[] {
    const themes: string[] = [];
    const text = `${translation} ${tafsir || ''}`.toLowerCase();
    
    // Keyword mapping untuk tema
    const themeKeywords: Record<string, string[]> = {
      'tauhid': ['allah', 'tuhan', 'sembah', 'ibadah', 'tawakal', 'iman'],
      'akhlak': ['baik', 'buruk', 'sabar', 'sabar', 'rendah hati', 'pemaaf'],
      'ibadah': ['shalat', 'puasa', 'zakat', 'haji', 'ibadah', 'sembahyang'],
      'sosial': ['orang', 'hamba', 'sahabat', 'keluarga', 'anak', 'istri'],
      'hukum': ['haram', 'halal', 'wajib', 'sunnah', 'hukum', 'perintah'],
      'cerita': ['kisah', 'nabi', 'rasul', 'firaun', 'kaum', 'masa lalu'],
      'akhirat': ['surga', 'neraka', 'hari kemudian', 'hisab', 'pahala', 'dosa'],
      'alam': ['langit', 'bumi', 'laut', 'gunung', 'matahari', 'bulan'],
      'ketuhanan': ['maha', 'kuasa', 'tahu', 'melihat', 'mendengar'],
      'petunjuk': ['petunjuk', 'hidayah', 'jalan', 'lurusan', 'benar']
    };
    
    // Cek setiap tema
    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      const hasMatch = keywords.some(keyword => text.includes(keyword));
      if (hasMatch) {
        themes.push(theme);
      }
    }
    
    // Tambahkan tema umum jika tidak ada tema spesifik
    if (themes.length === 0) {
      themes.push('umum');
    }
    
    return [...new Set(themes)]; // Remove duplicates
  }

  /**
   * Ringkas tafsir menjadi summary yang lebih pendek
   */
  private summarizeTafsir(tafsirText: string): string {
    // Ambil maksimal 500 karakter pertama
    const maxLength = 500;
    if (tafsirText.length <= maxLength) {
      return tafsirText;
    }
    
    // Cari kalimat terakhir yang lengkap
    const truncated = tafsirText.substring(0, maxLength);
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('?')
    );
    
    if (lastSentenceEnd > maxLength * 0.8) {
      return truncated.substring(0, lastSentenceEnd + 1);
    }
    
    return truncated + '...';
  }

  /**
   * Update data ayat tertentu dengan informasi baru
   */
  async updateVerseData(
    surahNumber: number, 
    ayatNumber: number, 
    updates: Partial<Omit<VerseEmbedding, 'id' | 'surahNumber' | 'ayatNumber' | 'embedding'>>
  ): Promise<void> {
    try {
      const currentVerse = await embeddingService.getVerse(surahNumber, ayatNumber);
      if (!currentVerse) {
        throw new Error(`Verse ${surahNumber}:${ayatNumber} not found`);
      }

      // Merge dengan data existing
      const updatedData = {
        surahNumber: currentVerse.surahNumber,
        surahNameLatin: updates.surahNameLatin || currentVerse.surahNameLatin,
        surahNameArabic: updates.surahNameArabic || currentVerse.surahNameArabic,
        ayatNumber: currentVerse.ayatNumber,
        arabicText: updates.arabicText || currentVerse.arabicText,
        indonesianTranslation: updates.indonesianTranslation || currentVerse.indonesianTranslation,
        contextBefore: updates.contextBefore !== undefined ? updates.contextBefore : currentVerse.contextBefore,
        contextAfter: updates.contextAfter !== undefined ? updates.contextAfter : currentVerse.contextAfter,
        tafsirSummary: updates.tafsirSummary !== undefined ? updates.tafsirSummary : currentVerse.tafsirSummary,
        themes: updates.themes || currentVerse.themes
      };

      // Re-generate embedding untuk data yang diupdate
      await embeddingService.saveVerse(updatedData);
      
      console.log(`Updated verse ${surahNumber}:${ayatNumber}`);
    } catch (error) {
      console.error(`Error updating verse ${surahNumber}:${ayatNumber}:`, error);
      throw error;
    }
  }

  /**
   * Cek status populasi data
   */
  async getPopulationStatus(): Promise<{
    totalVerses: number;
    versesWithEmbeddings: number;
    versesWithTafsir: number;
    versesWithThemes: number;
  }> {
    try {
      const [totalResult, embeddingResult, tafsirResult, themesResult] = await Promise.all([
        // Total ayat
        embeddingService.searchSimilarVerses('test', 100000, 0),
        // Ayat dengan embeddings
        embeddingService.searchSimilarVerses('test', 100000, 0.1),
        // Ayat dengan tafsir
        pool.query('SELECT COUNT(*) FROM quran_verses WHERE tafsir_summary IS NOT NULL'),
        // Ayat dengan themes
        pool.query('SELECT COUNT(*) FROM quran_verses WHERE themes IS NOT NULL AND array_length(themes, 1) > 0')
      ]);

      return {
        totalVerses: totalResult.length,
        versesWithEmbeddings: embeddingResult.length,
        versesWithTafsir: parseInt(tafsirResult.rows[0].count),
        versesWithThemes: parseInt(themesResult.rows[0].count)
      };
    } catch (error) {
      console.error("Error getting population status:", error);
      throw error;
    }
  }
}

export const quranDataService = QuranDataService.getInstance();