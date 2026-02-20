import { pool } from "../db/database";
import { embeddingService } from "./embeddingService";
import { conversationContextService } from "./conversationContextService";
import { getMockSimilarVerses } from "./mockData";

interface TafsirDiscussion {
  verseId: string;
  surahNumber: number;
  ayatNumber: number;
  arabicText: string;
  translation: string;
  tafsir: string;
  relatedVerses: Array<{
    surahNumber: number;
    ayatNumber: number;
    arabicText: string;
    translation: string;
    relevanceScore: number;
  }>;
  discussionPoints: string[];
}

/**
 * Service untuk mode diskusi tafsir
 * Memberikan penjelasan mendalam tentang ayat tertentu dengan referensi tafsir
 */
export class TafsirModeService {
  private static instance: TafsirModeService;

  private constructor() {}

  public static getInstance(): TafsirModeService {
    if (!TafsirModeService.instance) {
      TafsirModeService.instance = new TafsirModeService();
    }
    return TafsirModeService.instance;
  }

  /**
   * Mulai diskusi tafsir untuk ayat tertentu
   */
  async startTafsirDiscussion(surahNumber: number, ayatNumber: number): Promise<TafsirDiscussion> {
    try {
      let verse;
      
      // Gunakan mock data jika dalam mode mock
      if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
        const mockVerses = getMockSimilarVerses(`surah ${surahNumber} ayat ${ayatNumber}`, 10);
        verse = mockVerses.find(v => v.surahNumber === surahNumber && v.ayatNumber === ayatNumber);
        
        if (!verse) {
          throw new Error(`Ayat ${surahNumber}:${ayatNumber} tidak ditemukan`);
        }
      } else {
        // Ambil data ayat dari database
        const verseResult = await pool.query(`
          SELECT * FROM quran_verses 
          WHERE surah_number = $1 AND ayat_number = $2
          LIMIT 1
        `, [surahNumber, ayatNumber]);

        if (verseResult.rows.length === 0) {
          throw new Error(`Ayat ${surahNumber}:${ayatNumber} tidak ditemukan`);
        }

        verse = verseResult.rows[0];
      }

      // Cari ayat-ayat terkait berdasarkan tema dan konteks
      const relatedVerses = await this.findRelatedVerses(verse);

      // Generate discussion points berdasarkan tafsir
      const discussionPoints = this.generateDiscussionPoints(verse);

      return {
        verseId: verse.id || `${surahNumber}:${ayatNumber}`,
        surahNumber: verse.surahNumber || verse.surah_number,
        ayatNumber: verse.ayatNumber || verse.ayat_number,
        arabicText: verse.arabicText || verse.arabic_text,
        translation: verse.indonesianTranslation || verse.indonesian_translation,
        tafsir: verse.tafsirSummary || verse.tafsir_summary || "Tafsir tidak tersedia untuk ayat ini.",
        relatedVerses,
        discussionPoints
      };

    } catch (error) {
      console.error("Error starting tafsir discussion:", error);
      throw new Error("Gagal memulai diskusi tafsir");
    }
  }

  /**
   * Jawab pertanyaan tafsir dari user
   */
  async answerTafsirQuestion(surahNumber: number, ayatNumber: number, question: string): Promise<string> {
    try {
      let verse;
      
      // Gunakan mock data jika dalam mode mock
      if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
        const mockVerses = getMockSimilarVerses(`surah ${surahNumber} ayat ${ayatNumber}`, 10);
        verse = mockVerses.find(v => v.surahNumber === surahNumber && v.ayatNumber === ayatNumber);
        
        if (!verse) {
          return "Maaf, saya tidak dapat menemukan ayat tersebut. Silakan periksa nomor surah dan ayat.";
        }
      } else {
        // Ambil data ayat dan tafsir
        const verseResult = await pool.query(`
          SELECT * FROM quran_verses 
          WHERE surah_number = $1 AND ayat_number = $2
          LIMIT 1
        `, [surahNumber, ayatNumber]);

        if (verseResult.rows.length === 0) {
          return "Maaf, saya tidak dapat menemukan ayat tersebut. Silakan periksa nomor surah dan ayat.";
        }

        verse = verseResult.rows[0];
      }

      // Cari ayat-ayat terkait untuk konteks tambahan
      const relatedVerses = await this.findRelatedVerses(verse);

      // Buat konteks untuk AI
      const context = this.buildTafsirContext(verse, relatedVerses);

      // Gunakan OpenAI untuk menjawab pertanyaan tafsir
      const openai = new (await import('openai')).OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Kamu adalah ahli tafsir Al-Quran yang menjelaskan makna ayat dengan pendekatan ilmiah dan kontekstual.
            
Konteks ayat:
${context}

Berikan jawaban yang:
1. Berdasarkan tafsir yang sahih
2. Mudah dipahami oleh orang awam
3. Menyertakan konteks turunnya ayat jika relevan
4. Menghubungkan dengan tema-tema terkait
5. Tidak memaksa interpretasi yang subjektif`
          },
          {
            role: "user",
            content: question
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      });

      return completion.choices[0].message.content || "Maaf, saya tidak dapat menjawab pertanyaan ini.";

    } catch (error) {
      console.error("Error answering tafsir question:", error);
      return "Maaf, terjadi kesalahan saat memproses pertanyaan tafsir. Silakan coba lagi.";
    }
  }

  /**
   * Cari ayat-ayat terkait berdasarkan tema dan konteks
   */
  private async findRelatedVerses(verse: any): Promise<TafsirDiscussion['relatedVerses']> {
    try {
      // Gunakan mock data atau embedding untuk mencari ayat dengan tema serupa
      let similarVerses;
      
      if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
        // Gunakan mock data untuk pencarian ayat terkait
        const searchQuery = `${verse.tafsirSummary || verse.tafsir_summary || ''} ${verse.indonesianTranslation || verse.indonesian_translation || ''} ${verse.themes?.join(' ') || ''}`;
        const mockVerses = getMockSimilarVerses(searchQuery, 10);
        
        similarVerses = mockVerses.map(v => ({
          surahNumber: v.surahNumber,
          ayatNumber: v.ayatNumber,
          arabicText: v.arabicText,
          indonesianTranslation: v.indonesianTranslation,
          similarity: 0.8 // Mock similarity score
        }));
      } else {
        // Gunakan embedding service untuk pencarian ayat terkait
        similarVerses = await embeddingService.searchSimilarVerses(
          `${verse.tafsir_summary || verse.indonesian_translation} ${verse.themes?.join(' ') || ''}`,
          5,
          0.6
        );
      }

      // Filter ayat yang sama dan ambil yang paling relevan
      const currentSurah = verse.surahNumber || verse.surah_number;
      const currentAyat = verse.ayatNumber || verse.ayat_number;
      
      const relatedVerses = similarVerses
        .filter(v => !(v.surahNumber === currentSurah && v.ayatNumber === currentAyat))
        .slice(0, 3)
        .map(v => ({
          surahNumber: v.surahNumber,
          ayatNumber: v.ayatNumber,
          arabicText: v.arabicText,
          translation: v.indonesianTranslation,
          relevanceScore: v.similarity || 0
        }));

      return relatedVerses;

    } catch (error) {
      console.error("Error finding related verses:", error);
      return [];
    }
  }

  /**
   * Generate discussion points berdasarkan tafsir
   */
  private generateDiscussionPoints(verse: any): string[] {
    const points: string[] = [];

    if (verse.tafsir_summary) {
      points.push("Makna kata-kata kunci dalam ayat ini");
      points.push("Konteks turunnya ayat (asbabun nuzul)");
      points.push("Pelajaran utama dari ayat ini");
      points.push("Hubungan dengan ayat sebelumnya dan sesudahnya");
    }

    if (verse.themes && verse.themes.length > 0) {
      points.push(`Tema utama: ${verse.themes.join(', ')}`);
    }

    if (verse.context_before || verse.context_after) {
      points.push("Konteks dalam struktur surah");
    }

    return points;
  }

  /**
   * Build konteks untuk AI
   */
  private buildTafsirContext(verse: any, relatedVerses: TafsirDiscussion['relatedVerses']): string {
    const surahNumber = verse.surahNumber || verse.surah_number;
    const ayatNumber = verse.ayatNumber || verse.ayat_number;
    const arabicText = verse.arabicText || verse.arabic_text;
    const translation = verse.indonesianTranslation || verse.indonesian_translation;
    const tafsir = verse.tafsirSummary || verse.tafsir_summary;
    const themes = verse.themes;
    const contextBefore = verse.contextBefore || verse.context_before;
    const contextAfter = verse.contextAfter || verse.context_after;
    
    let context = `Ayat: QS. ${surahNumber}:${ayatNumber}
Arab: ${arabicText}
Terjemahan: ${translation}`;

    if (tafsir) {
      context += `\nTafsir: ${tafsir}`;
    }

    if (contextBefore) {
      context += `\nKonteks sebelum: ${contextBefore}`;
    }

    if (contextAfter) {
      context += `\nKonteks sesudah: ${contextAfter}`;
    }

    if (themes && themes.length > 0) {
      context += `\nTema: ${themes.join(', ')}`;
    }

    if (relatedVerses.length > 0) {
      context += "\n\nAyat terkait:";
      relatedVerses.forEach(v => {
        context += `\n- QS. ${v.surahNumber}:${v.ayatNumber} - ${v.translation}`;
      });
    }

    return context;
  }

  /**
   * Cek apakah pertanyaan user adalah tentang tafsir
   */
  isTafsirQuestion(message: string): boolean {
    const tafsirKeywords = [
      'tafsir', 'makna', 'arti', 'penjelasan', 'maksud', 'yang dimaksud',
      'bagaimana', 'mengapa', 'kenapa', 'apa arti', 'apa maksud'
    ];

    const lowerMessage = message.toLowerCase();
    
    // Cek apakah ada kata kunci tafsir
    const hasTafsirKeyword = tafsirKeywords.some(keyword => 
      lowerMessage.includes(keyword)
    );

    // Cek apakah ada referensi ayat (pattern QS. X:Y atau surah X ayat Y)
    const versePattern = /(?:qs\.?\s*\d+:\d+|surah\s+\d+\s+ayat\s+\d+|surah\s+\w+\s+ayat\s+\d+)/i;
    const hasVerseReference = versePattern.test(message);

    return hasTafsirKeyword || hasVerseReference;
  }

  /**
   * Extract nomor surah dan ayat dari pesan
   */
  extractVerseReference(message: string): {surahNumber: number, ayatNumber: number} | null {
    // Pattern QS. X:Y
    const pattern1 = /qs\.?\s*(\d+):(\d+)/i;
    const match1 = message.match(pattern1);
    if (match1) {
      return {
        surahNumber: parseInt(match1[1]),
        ayatNumber: parseInt(match1[2])
      };
    }

    // Pattern surah X ayat Y
    const pattern2 = /surah\s+(\d+)\s+ayat\s+(\d+)/i;
    const match2 = message.match(pattern2);
    if (match2) {
      return {
        surahNumber: parseInt(match2[1]),
        ayatNumber: parseInt(match2[2])
      };
    }

    return null;
  }
}

export const tafsirModeService = TafsirModeService.getInstance();