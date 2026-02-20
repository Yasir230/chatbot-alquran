import axios from "axios";

interface Ayat {
  nomorAyat: number;
  teksArab: string;
  teksLatin: string;
  teksIndonesia: string;
}

interface Surah {
  nomor: number;
  nama: string;
  namaLatin: string;
  jumlahAyat: number;
  ayat: Ayat[];
}

interface SearchResult {
  surah: string;
  surah_number: number;
  ayat: number;
  arab: string;
  terjemahan: string;
}

class QuranService {
  private static instance: QuranService;
  private cache: Surah[] = [];
  private baseUrl = process.env.EQURAN_API_URL || "https://equran.id/api/v2";
  private isLoading = false;

  private constructor() {}

  public static getInstance(): QuranService {
    if (!QuranService.instance) {
      QuranService.instance = new QuranService();
    }
    return QuranService.instance;
  }

  // Load all surahs into cache (lazy load)
  private async loadCache(): Promise<void> {
    if (this.cache.length > 0 || this.isLoading) return;
    
    this.isLoading = true;
    console.log("Starting to cache Quran data...");

    try {
      // Fetch list of surahs first
      const listResponse = await axios.get(`${this.baseUrl}/surat`);
      const surahList = listResponse.data.data; // API v2 usually wraps in data

      // Process in chunks to avoid rate limiting
      const chunkSize = 5;
      for (let i = 0; i < surahList.length; i += chunkSize) {
        const chunk = surahList.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (surahSummary: any) => {
            try {
              const detailResponse = await axios.get(`${this.baseUrl}/surat/${surahSummary.nomor}`);
              const surahData = detailResponse.data.data;
              this.cache.push({
                nomor: surahData.nomor,
                nama: surahData.nama,
                namaLatin: surahData.namaLatin,
                jumlahAyat: surahData.jumlahAyat,
                ayat: surahData.ayat
              });
            } catch (err) {
              console.error(`Failed to fetch surah ${surahSummary.nomor}`, err);
            }
          })
        );
        // Small delay between chunks
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Sort cache by nomor
      this.cache.sort((a, b) => a.nomor - b.nomor);
      console.log(`Cached ${this.cache.length} surahs.`);
    } catch (error) {
      console.error("Failed to load Quran cache:", error);
    } finally {
      this.isLoading = false;
    }
  }

  public async searchVerses(keyword: string, limit: number = 10): Promise<SearchResult[]> {
    // Trigger cache load if empty, but don't wait for it completely if we want immediate results?
    // For now, we'll try to search what we have, or fetch on demand if cache is empty.
    if (this.cache.length === 0) {
      // If cache is empty, we might need to fallback to direct API search for the first request
      // Or just wait for a partial load.
      // Let's just start loading and wait for it? No, that takes too long.
      // Strategy: Use direct API for now if cache is empty, but trigger background load.
      this.loadCache(); // Start background loading
      
      // Fallback: search a few popular surahs directly or return empty?
      // Better: Search directly using the slow method for this request
      return this.searchDirect(keyword, limit);
    }

    const results: SearchResult[] = [];
    const lowerKeyword = keyword.toLowerCase();

    for (const surah of this.cache) {
      for (const ayat of surah.ayat) {
        if (ayat.teksIndonesia.toLowerCase().includes(lowerKeyword)) {
          results.push({
            surah: surah.namaLatin,
            surah_number: surah.nomor,
            ayat: ayat.nomorAyat,
            arab: ayat.teksArab,
            terjemahan: ayat.teksIndonesia
          });
          if (results.length >= limit) return results;
        }
      }
    }

    return results;
  }

  // Direct search (slow, used when cache is not ready)
  private async searchDirect(keyword: string, limit: number): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    try {
        const listResponse = await axios.get(`${this.baseUrl}/surat`);
        const surahList = listResponse.data.data;

        // Search in first 20 surahs + Al-Mulk + Yasin + Al-Kahfi + Al-Waqiah (popular ones)
        // to save time
        const prioritySurahs = [1, 2, 3, 36, 18, 56, 67, ...surahList.slice(0, 10).map((s: any) => s.nomor)];
        const uniqueSurahs = [...new Set(prioritySurahs)];

        for (const nomor of uniqueSurahs) {
            try {
                const detailResponse = await axios.get(`${this.baseUrl}/surat/${nomor}`);
                const surah = detailResponse.data.data;
                
                for (const ayat of surah.ayat) {
                    if (ayat.teksIndonesia.toLowerCase().includes(keyword.toLowerCase())) {
                        results.push({
                            surah: surah.namaLatin,
                            surah_number: surah.nomor,
                            ayat: ayat.nomorAyat,
                            arab: ayat.teksArab,
                            terjemahan: ayat.teksIndonesia
                        });
                        if (results.length >= limit) return results;
                    }
                }
            } catch (e) { continue; }
        }
    } catch (e) {
        console.error("Direct search failed", e);
    }
    return results;
  }
}

export const quranService = QuranService.getInstance();
