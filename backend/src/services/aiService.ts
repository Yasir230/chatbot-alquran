import OpenAI from "openai";
import { embeddingService } from "./embeddingService";
import { conversationContextService } from "./conversationContextService";

const SYSTEM_PROMPT = `Kamu adalah asisten Islam yang menjawab berdasarkan Al-Quran dan Hadits.
ATURAN WAJIB:
1. Setiap jawaban HARUS menyertakan referensi ayat (QS. NamaSurah:NomorAyat)
2. Jika tidak ada referensi langsung, katakan dengan jelas
3. Tidak memberikan fatwa atau hukum fiqh tanpa referensi ulama
4. Jawab dalam bahasa yang sama dengan pertanyaan user
5. Sertakan terjemahan ayat dalam jawaban
6. Gunakan HANYA referensi yang diberikan dalam context. Jangan mengarang ayat.`;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Fungsi untuk search ayat relevan menggunakan semantic embeddings
async function searchRelevantVerses(query: string): Promise<any[]> {
  try {
    // Gunakan embeddingService untuk semantic search
    const semanticResults = await embeddingService.searchSimilarVerses(query, 5, 0.7);
    
    // Konversi ke format yang sama dengan sebelumnya untuk kompatibilitas
    return semanticResults.map(verse => ({
      surah: verse.surahNameLatin,
      surah_number: verse.surahNumber,
      ayat: verse.ayatNumber,
      arab: verse.arabicText,
      terjemahan: verse.indonesianTranslation,
      tafsir: verse.tafsirSummary,
      context_before: verse.contextBefore,
      context_after: verse.contextAfter,
      themes: verse.themes,
      similarity: verse.similarity
    }));
  } catch (error) {
    console.error("Error searching relevant verses with embeddings:", error);
    return []; // Fallback ke array kosong
  }
}

export async function createAIResponse(message: string, conversationHistory: any[] = [], conversationId?: string) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      answer: "Konfigurasi OPENAI_API_KEY belum diset di server.",
      sources: []
    };
  }

  try {
    // 1. Search ayat relevan menggunakan semantic embeddings
    let relevantVerses = await searchRelevantVerses(message);
    
    // 2. Re-ranking berdasarkan conversation context jika ada conversationId
    if (conversationId) {
      relevantVerses = await conversationContextService.rerankResults(
        conversationId, 
        relevantVerses,
        message
      );
    }
    
    // 3. Update conversation context dengan ayat yang akan digunakan
    if (conversationId && relevantVerses.length > 0) {
      const versesToUpdate = relevantVerses.slice(0, 3).map(v => ({
        surahNumber: v.surah_number,
        ayatNumber: v.ayat
      }));
      
      await conversationContextService.updateContext(
        conversationId,
        versesToUpdate,
        relevantVerses[0].similarity || 0.8
      );
    }
    
    // 4. Format referensi untuk context dengan tafsir dan konteks
    const contextMessage = relevantVerses.length > 0 
      ? `Referensi Al-Quran yang relevan:\n${relevantVerses.map(v => 
        `QS. ${v.surah}:${v.ayat} (Similarity: ${(v.similarity * 100).toFixed(1)}%)\n` +
        `Arab: ${v.arab}\n` +
        `Terjemahan: ${v.terjemahan}\n` +
        (v.tafsir ? `Tafsir: ${v.tafsir}\n` : '') +
        (v.themes && v.themes.length > 0 ? `Tema: ${v.themes.join(', ')}\n` : '') +
        (v.context_before ? `Konteks Sebelum: ${v.context_before}\n` : '') +
        (v.context_after ? `Konteks Sesudah: ${v.context_after}\n` : '')
      ).join('\n\n')}`
      : "Tidak ditemukan ayat Al-Quran yang relevan dengan pertanyaan ini.";

    // 5. Bangun conversation history
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversationHistory.slice(-10).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: "system", content: contextMessage },
      { role: "user", content: message }
    ] as any[];

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      max_tokens: 1000,
      temperature: 0.3
    });

    return {
      answer: completion.choices[0].message.content || "Maaf, saya tidak dapat menjawab saat ini.",
      sources: relevantVerses
    };

  } catch (error) {
    console.error("AI Service Error:", error);
    return {
      answer: "Maaf, terjadi kesalahan pada sistem AI.",
      sources: []
    };
  }
}