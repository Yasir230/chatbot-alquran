import OpenAI from "openai";
import { pool } from "../db/database";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface VerseEmbedding {
  id: string;
  surahNumber: number;
  surahNameLatin: string;
  surahNameArabic: string;
  ayatNumber: number;
  arabicText: string;
  indonesianTranslation: string;
  contextBefore?: string;
  contextAfter?: string;
  tafsirSummary?: string;
  themes: string[];
  embedding: number[];
  similarity?: number; // Tambahkan properti similarity untuk hasil pencarian
}

export class EmbeddingService {
  private static instance: EmbeddingService;

  private constructor() {}

  public static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  /**
   * Generate embedding untuk teks menggunakan OpenAI
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
        encoding_format: "float",
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw new Error("Failed to generate embedding");
    }
  }

  /**
   * Simpan ayat ke database dengan embedding
   */
  async saveVerse(verse: Omit<VerseEmbedding, 'id' | 'embedding'>): Promise<string> {
    try {
      // Generate embedding untuk kombinasi teks + konteks
      const textToEmbed = this.createEmbeddingText(verse);
      const embedding = await this.generateEmbedding(textToEmbed);

      const result = await pool.query(
        `INSERT INTO quran_verses (
          surah_number, surah_name_latin, surah_name_arabic, ayat_number,
          arabic_text, indonesian_translation, context_before, context_after,
          tafsir_summary, themes, embedding
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (surah_number, ayat_number) 
        DO UPDATE SET
          tafsir_summary = EXCLUDED.tafsir_summary,
          themes = EXCLUDED.themes,
          embedding = EXCLUDED.embedding,
          updated_at = NOW()
        RETURNING id`,
        [
          verse.surahNumber,
          verse.surahNameLatin,
          verse.surahNameArabic,
          verse.ayatNumber,
          verse.arabicText,
          verse.indonesianTranslation,
          verse.contextBefore,
          verse.contextAfter,
          verse.tafsirSummary,
          verse.themes,
          embedding
        ]
      );

      return result.rows[0].id;
    } catch (error) {
      console.error("Error saving verse:", error);
      throw new Error("Failed to save verse");
    }
  }

  /**
   * Cari ayat berdasarkan semantic similarity
   */
  async searchSimilarVerses(
    query: string, 
    limit: number = 5, 
    threshold: number = 0.7
  ): Promise<VerseEmbedding[]> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      
      const result = await pool.query(
        `SELECT 
          id, surah_number, surah_name_latin, surah_name_arabic, ayat_number,
          arabic_text, indonesian_translation, context_before, context_after,
          tafsir_summary, themes,
          1 - (embedding <=> $1) as similarity
        FROM quran_verses
        WHERE 1 - (embedding <=> $1) > $2
        ORDER BY embedding <=> $1
        LIMIT $3`,
        [queryEmbedding, threshold, limit]
      );

      return result.rows.map(row => ({
        id: row.id,
        surahNumber: row.surah_number,
        surahNameLatin: row.surah_name_latin,
        surahNameArabic: row.surah_name_arabic,
        ayatNumber: row.ayat_number,
        arabicText: row.arabic_text,
        indonesianTranslation: row.indonesian_translation,
        contextBefore: row.context_before,
        contextAfter: row.context_after,
        tafsirSummary: row.tafsir_summary,
        themes: row.themes,
        embedding: row.embedding,
        similarity: row.similarity
      }));
    } catch (error) {
      console.error("Error searching similar verses:", error);
      throw new Error("Failed to search similar verses");
    }
  }

  /**
   * Cari ayat berdasarkan tema
   */
  async searchByThemes(themes: string[], limit: number = 10): Promise<VerseEmbedding[]> {
    try {
      const result = await pool.query(
        `SELECT 
          id, surah_number, surah_name_latin, surah_name_arabic, ayat_number,
          arabic_text, indonesian_translation, context_before, context_after,
          tafsir_summary, themes
        FROM quran_verses
        WHERE themes && $1 -- Array overlap
        ORDER BY array_length(themes && $1, 1) DESC
        LIMIT $2`,
        [themes, limit]
      );

      return result.rows.map(row => ({
        id: row.id,
        surahNumber: row.surah_number,
        surahNameLatin: row.surah_name_latin,
        surahNameArabic: row.surah_name_arabic,
        ayatNumber: row.ayat_number,
        arabicText: row.arabic_text,
        indonesianTranslation: row.indonesian_translation,
        contextBefore: row.context_before,
        contextAfter: row.context_after,
        tafsirSummary: row.tafsir_summary,
        themes: row.themes,
        embedding: []
      }));
    } catch (error) {
      console.error("Error searching by themes:", error);
      throw new Error("Failed to search by themes");
    }
  }

  /**
   * Ambil ayat berdasarkan nomor surah dan ayat
   */
  async getVerse(surahNumber: number, ayatNumber: number): Promise<VerseEmbedding | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM quran_verses 
         WHERE surah_number = $1 AND ayat_number = $2`,
        [surahNumber, ayatNumber]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        surahNumber: row.surah_number,
        surahNameLatin: row.surah_name_latin,
        surahNameArabic: row.surah_name_arabic,
        ayatNumber: row.ayat_number,
        arabicText: row.arabic_text,
        indonesianTranslation: row.indonesian_translation,
        contextBefore: row.context_before,
        contextAfter: row.context_after,
        tafsirSummary: row.tafsir_summary,
        themes: row.themes,
        embedding: row.embedding
      };
    } catch (error) {
      console.error("Error getting verse:", error);
      throw new Error("Failed to get verse");
    }
  }

  /**
   * Buat teks untuk embedding dari ayat
   */
  private createEmbeddingText(verse: Omit<VerseEmbedding, 'id' | 'embedding'>): string {
    const parts = [];
    
    // Informasi surah
    parts.push(`Surah ${verse.surahNameLatin} (${verse.surahNameArabic}) ayat ${verse.ayatNumber}`);
    
    // Konteks sebelumnya jika ada
    if (verse.contextBefore) {
      parts.push(`Konteks sebelum: ${verse.contextBefore}`);
    }
    
    // Teks Arab
    parts.push(`Teks Arab: ${verse.arabicText}`);
    
    // Terjemahan
    parts.push(`Terjemahan: ${verse.indonesianTranslation}`);
    
    // Konteks sesudahnya jika ada
    if (verse.contextAfter) {
      parts.push(`Konteks sesudah: ${verse.contextAfter}`);
    }
    
    // Tafsir jika ada
    if (verse.tafsirSummary) {
      parts.push(`Tafsir: ${verse.tafsirSummary}`);
    }
    
    // Tema jika ada
    if (verse.themes && verse.themes.length > 0) {
      parts.push(`Tema: ${verse.themes.join(', ')}`);
    }
    
    return parts.join('\n');
  }

  /**
   * Cek apakah embeddings sudah siap
   */
  async isReady(): Promise<boolean> {
    try {
      const result = await pool.query('SELECT COUNT(*) FROM quran_verses WHERE embedding IS NOT NULL');
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      console.error("Error checking embeddings readiness:", error);
      return false;
    }
  }

  /**
   * Hapus semua embeddings (untuk re-indexing)
   */
  async clearAllEmbeddings(): Promise<void> {
    try {
      await pool.query('UPDATE quran_verses SET embedding = NULL, themes = NULL, tafsir_summary = NULL');
    } catch (error) {
      console.error("Error clearing embeddings:", error);
      throw new Error("Failed to clear embeddings");
    }
  }
}

export const embeddingService = EmbeddingService.getInstance();