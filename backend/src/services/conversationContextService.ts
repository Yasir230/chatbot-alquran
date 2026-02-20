import { pool } from "../db/database";
import { embeddingService } from "./embeddingService";

interface ConversationContext {
  conversationId: string;
  discussedVerses: Array<{
    surahNumber: number;
    ayatNumber: number;
    relevanceScore: number;
    discussionCount: number;
  }>;
  themes: string[];
  lastUpdated: Date;
}

/**
 * Service untuk conversation context dan re-ranking
 * Menyimpan ayat-ayat yang sudah dibahas dan melakukan re-ranking berdasarkan konteks percakapan
 */
export class ConversationContextService {
  private static instance: ConversationContextService;

  private constructor() {}

  public static getInstance(): ConversationContextService {
    if (!ConversationContextService.instance) {
      ConversationContextService.instance = new ConversationContextService();
    }
    return ConversationContextService.instance;
  }

  /**
   * Update conversation context dengan ayat yang baru dibahas
   */
  async updateContext(conversationId: string, verses: Array<{surahNumber: number; ayatNumber: number}>, relevanceScore: number = 1.0): Promise<void> {
    try {
      // Ambil context existing
      const existingContext = await this.getContext(conversationId);
      
      // Update atau tambahkan ayat baru
      for (const verse of verses) {
        const existingIndex = existingContext.discussedVerses.findIndex(
          v => v.surahNumber === verse.surahNumber && v.ayatNumber === verse.ayatNumber
        );
        
        if (existingIndex >= 0) {
          // Update existing verse (increment discussion count dan update relevance)
          existingContext.discussedVerses[existingIndex].discussionCount += 1;
          existingContext.discussedVerses[existingIndex].relevanceScore = Math.max(
            existingContext.discussedVerses[existingIndex].relevanceScore,
            relevanceScore
          );
        } else {
          // Tambahkan ayat baru
          existingContext.discussedVerses.push({
            surahNumber: verse.surahNumber,
            ayatNumber: verse.ayatNumber,
            relevanceScore,
            discussionCount: 1
          });
        }
      }
      
      // Update last updated
      existingContext.lastUpdated = new Date();
      
      // Simpan ke database
      await this.saveContext(conversationId, existingContext);
      
    } catch (error) {
      console.error("Error updating conversation context:", error);
      throw new Error("Failed to update conversation context");
    }
  }

  /**
   * Ambil conversation context
   */
  async getContext(conversationId: string): Promise<ConversationContext> {
    try {
      const result = await pool.query(
        `SELECT * FROM conversation_context WHERE conversation_id = $1`,
        [conversationId]
      );
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          conversationId,
          discussedVerses: row.discussed_verses || [],
          themes: row.themes || [],
          lastUpdated: row.last_updated
        };
      } else {
        // Return default context jika belum ada
        return {
          conversationId,
          discussedVerses: [],
          themes: [],
          lastUpdated: new Date()
        };
      }
    } catch (error) {
      console.error("Error getting conversation context:", error);
      throw new Error("Failed to get conversation context");
    }
  }

  /**
   * Re-ranking hasil pencarian berdasarkan conversation context
   */
  async rerankResults(
    conversationId: string, 
    searchResults: Array<any>,
    query: string
  ): Promise<Array<any>> {
    try {
      const context = await this.getContext(conversationId);
      
      if (context.discussedVerses.length === 0) {
        // Tidak ada context, return results as-is
        return searchResults;
      }
      
      // Hitung re-ranking scores
      const rerankedResults = searchResults.map(result => {
        let contextScore = 0;
        
        // Cek apakah ayat ini sudah dibahas sebelumnya
        const discussedVerse = context.discussedVerses.find(
          v => v.surahNumber === result.surahNumber && v.ayatNumber === result.ayatNumber
        );
        
        if (discussedVerse) {
          // Berikan boost untuk ayat yang sudah dibahas (tapi tidak terlalu besar untuk menghindari repetisi)
          contextScore = Math.min(0.1 * discussedVerse.discussionCount, 0.3);
        }
        
        // Cek apakah ada ayat sebelumnya dari surah yang sama
        const sameSurahDiscussions = context.discussedVerses.filter(
          v => v.surahNumber === result.surahNumber
        ).length;
        
        if (sameSurahDiscussions > 0) {
          // Berikan sedikit boost untuk ayat dari surah yang sudah dibahas
          contextScore += 0.05 * sameSurahDiscussions;
        }
        
        // Hitung final score (gabungkan similarity score dengan context score)
        const finalScore = result.similarity + contextScore;
        
        return {
          ...result,
          originalSimilarity: result.similarity,
          contextScore,
          finalScore
        };
      });
      
      // Sort berdasarkan final score (descending)
      rerankedResults.sort((a, b) => b.finalScore - a.finalScore);
      
      return rerankedResults;
      
    } catch (error) {
      console.error("Error reranking results:", error);
      // Fallback: return original results
      return searchResults;
    }
  }

  /**
   * Simpan context ke database
   */
  private async saveContext(conversationId: string, context: ConversationContext): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO conversation_context (conversation_id, discussed_verses, themes, last_updated)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (conversation_id) 
        DO UPDATE SET 
          discussed_verses = $2,
          themes = $3,
          last_updated = $4
      `, [
        conversationId,
        JSON.stringify(context.discussedVerses),
        JSON.stringify(context.themes),
        context.lastUpdated
      ]);
    } catch (error) {
      console.error("Error saving conversation context:", error);
      throw new Error("Failed to save conversation context");
    }
  }

  /**
   * Hapus context yang sudah lama tidak digunakan (opsional cleanup)
   */
  async cleanupOldContexts(daysOld: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      await pool.query(`
        DELETE FROM conversation_context 
        WHERE last_updated < $1
      `, [cutoffDate]);
      
      console.log(`Cleaned up conversation contexts older than ${daysOld} days`);
    } catch (error) {
      console.error("Error cleaning up old contexts:", error);
    }
  }
}

export const conversationContextService = ConversationContextService.getInstance();