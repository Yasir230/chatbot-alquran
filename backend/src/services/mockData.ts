// Mock data untuk Quran verses - sample untuk testing
export interface MockQuranVerse {
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
}

export const mockQuranVerses: MockQuranVerse[] = [
  {
    id: 'mock-verse-1',
    surahNumber: 1,
    surahNameLatin: 'Al-Fatihah',
    surahNameArabic: 'الفاتحة',
    ayatNumber: 1,
    arabicText: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    indonesianTranslation: 'Dengan menyebut nama Allah Yang Maha Pemurah lagi Maha Penyayang.',
    contextAfter: 'Ayat pembuka Al-Quran yang menunjukkan kebesaran dan kasih sayang Allah',
    tafsirSummary: 'Ayat ini mengajarkan bahwa setiap amalan yang baik harus dimulai dengan menyebut nama Allah. Merupakan bentuk tawakal dan permohonan pertolongan-Nya.',
    themes: ['tawakal', 'permulaan', 'kasih sayang'],
    embedding: Array(1536).fill(0).map(() => Math.random() * 2 - 1)
  },
  {
    id: 'mock-verse-2',
    surahNumber: 1,
    surahNameLatin: 'Al-Fatihah',
    surahNameArabic: 'الفاتحة',
    ayatNumber: 2,
    arabicText: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    indonesianTranslation: 'Segala puji bagi Allah, Tuhan semesta alam.',
    contextBefore: 'Ayat sebelumnya mengajarkan pentingnya memulai dengan nama Allah',
    contextAfter: 'Ayat ini menegaskan bahwa Allah adalah pencipta dan pengatur alam semesta',
    tafsirSummary: 'Menyatakan kebesaran Allah sebagai pencipta dan pengatur segala yang ada. Mengandung pengakuan bahwa segala bentuk kebaikan berasal dari Allah.',
    themes: ['puji', 'kebesaran Allah', 'penciptaan'],
    embedding: Array(1536).fill(0).map(() => Math.random() * 2 - 1)
  },
  {
    id: 'mock-verse-3',
    surahNumber: 1,
    surahNameLatin: 'Al-Fatihah',
    surahNameArabic: 'الفاتحة',
    ayatNumber: 3,
    arabicText: 'الرَّحْمَٰنِ الرَّحِيمِ',
    indonesianTranslation: 'Yang Maha Pemurah lagi Maha Penyayang.',
    contextBefore: 'Ayat sebelumnya menyatakan kebesaran Allah sebagai Tuhan semesta alam',
    contextAfter: 'Ayat ini memperjelas sifat kasih sayang Allah yang meliputi seluruh makhluk',
    tafsirSummary: 'Menyatakan dua sifat utama Allah: Ar-Rahman (Maha Pemurah kepada semua makhluk) dan Ar-Rahim (Maha Penyayang kepada orang-orang yang beriman).',
    themes: ['kasih sayang', 'rahmat', 'sifat Allah'],
    embedding: Array(1536).fill(0).map(() => Math.random() * 2 - 1)
  },
  {
    id: 'mock-verse-4',
    surahNumber: 2,
    surahNameLatin: 'Al-Baqarah',
    surahNameArabic: 'البقرة',
    ayatNumber: 1,
    arabicText: 'الم',
    indonesianTranslation: 'Alif Lam Mim.',
    contextAfter: 'Huruf-huruf pendahuluan yang menjadi mukjizat Al-Quran',
    tafsirSummary: 'Huruf-huruf muqatta\'ah yang hanya Allah yang mengetahui maknanya. Menunjukkan keajaiban Al-Quran yang tidak dapat ditiru.',
    themes: ['mukjizat', 'huruf muqattaah', 'keajaiban Quran'],
    embedding: Array(1536).fill(0).map(() => Math.random() * 2 - 1)
  },
  {
    id: 'mock-verse-5',
    surahNumber: 2,
    surahNameLatin: 'Al-Baqarah',
    surahNameArabic: 'البقرة',
    ayatNumber: 2,
    arabicText: 'ذَٰلِكَ الْكِتَابُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَ',
    indonesianTranslation: 'Al-Quran ini tidak ada keraguan padanya, petunjuk bagi orang-orang yang bertakwa.',
    contextBefore: 'Huruf muqattaah sebagai pembuka',
    contextAfter: 'Ayat ini menjelaskan siapa yang mendapat petunjuk dari Al-Quran',
    tafsirSummary: 'Al-Quran adalah kitab yang sempurna tanpa keraguan. Hanya orang-orang yang bertakwa yang dapat mengambil petunjuk darinya.',
    themes: ['petunjuk', 'takwa', 'kebenaran Quran'],
    embedding: Array(1536).fill(0).map(() => Math.random() * 2 - 1)
  },
  {
    id: 'mock-verse-6',
    surahNumber: 2,
    surahNameLatin: 'Al-Baqarah',
    surahNameArabic: 'البقرة',
    ayatNumber: 3,
    arabicText: 'الَّذِينَ يُؤْمِنُونَ بِالْغَيْبِ وَيُقِيمُونَ الصَّلَاةَ وَمِمَّا رَزَقْنَاهُمْ يُنفِقُونَ',
    indonesianTranslation: 'Yaitu orang-orang yang beriman kepada yang ghaib, mendirikan shalat, dan menginfakkan sebagian rezeki yang Kami berikan kepada mereka.',
    contextBefore: 'Ayat sebelumnya menyebut Al-Quran sebagai petunjuk',
    contextAfter: 'Ayat ini menjelaskan ciri-ciri orang yang bertakwa',
    tafsirSummary: 'Ciri orang bertakwa: beriman kepada hal-hal yang ghaib (Allah, malaikat, hari akhir), konsisten shalat, dan bersikap dermawan.',
    themes: ['iman', 'shalat', 'infak', 'ciri orang bertakwa'],
    embedding: Array(1536).fill(0).map(() => Math.random() * 2 - 1)
  }
];

// Mock tafsir data
export const mockTafsirData = {
  '1': {
    '1': {
      teks: 'Bismillah adalah ayat pembuka setiap surah dalam Al-Quran kecuali Surah At-Taubah. Mengandung penegasan bahwa setiap amalan harus dimulai dengan menyebut nama Allah.',
      tema: ['tawakal', 'permulaan'],
      ayat_terkait: [2, 3, 4]
    },
    '2': {
      teks: 'Alhamdulillah adalah ungkapan syukur dan penghormatan kepada Allah. Menunjukkan bahwa segala bentuk kebaikan berasal dari Allah semata.',
      tema: ['syukur', 'puji'],
      ayat_terkait: [1, 3, 4]
    },
    '3': {
      teks: 'Ar-Rahman dan Ar-Rahim adalah dua sifat Allah yang menunjukkan kasih sayang-Nya. Rahman untuk semua makhluk, Rahim khusus untuk orang beriman.',
      tema: ['kasih sayang', 'rahmat'],
      ayat_terkait: [1, 2, 4]
    }
  },
  '2': {
    '1': {
      teks: 'Alif Lam Mim adalah huruf muqattaah yang menjadi mukjizat Al-Quran. Hanya Allah yang mengetahui makna sebenarnya.',
      tema: ['mukjizat', 'huruf muqattaah'],
      ayat_terkait: [2, 3]
    },
    '2': {
      teks: 'Al-Quran adalah kitab yang sempurna tanpa keraguan. Petunjuk ini hanya bisa diambil oleh orang yang bertakwa.',
      tema: ['petunjuk', 'takwa'],
      ayat_terkait: [1, 3]
    },
    '3': {
      teks: 'Orang yang bertakwa memiliki tiga ciri utama: beriman kepada yang ghaib, konsisten shalat, dan dermawan.',
      tema: ['iman', 'shalat', 'infak'],
      ayat_terkait: [1, 2]
    }
  }
};

// Mock embeddings untuk similarity search
export function getMockSimilarVerses(query: string, limit: number = 3): MockQuranVerse[] {
  // Simple mock similarity based on keyword matching
  const keywords = query.toLowerCase().split(' ');
  const scored = mockQuranVerses.map(verse => {
    let score = 0;
    const text = `${verse.arabicText} ${verse.indonesianTranslation} ${verse.tafsirSummary} ${verse.themes.join(' ')}`.toLowerCase();
    
    keywords.forEach(keyword => {
      if (text.includes(keyword)) score += 1;
    });
    
    return { verse, score };
  });
  
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.verse);
}