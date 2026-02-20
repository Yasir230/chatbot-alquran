import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { quranApi } from "../services/api";
import CitationCard from "../components/CitationCard";
import { Search, MessageCircle, BookOpen, LogOut, Sparkles, Star } from "lucide-react";

interface Surah {
  nomor: number;
  nama_latin: string;
  nama: string;
  jumlah_ayat: number;
  tempat_turun: string;
}

interface Ayat {
  nomor: number;
  ar: string;
  idn: string;
  id_indonesia: string;
}

interface SearchResult {
  surah: string;
  surah_number: number;
  ayat: number;
  arab: string;
  terjemahan: string;
}

function QuranPage() {
  const [surahList, setSurahList] = useState<Surah[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [ayat, setAyat] = useState<Ayat[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  // Debounce search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    try {
      const response = await quranApi.searchAyat(query);
      setSearchResults(response.data.results || []);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Load semua surah
  useEffect(() => {
    loadSurahList();
  }, []);

  const loadSurahList = async () => {
    try {
      const response = await quranApi.getSurahList();
      setSurahList(response.data.data || response.data);
    } catch (error) {
      console.error("Failed to load surah list:", error);
    }
  };

  const loadSurahDetail = async (surah: Surah) => {
    try {
      setSelectedSurah(surah);
      const response = await quranApi.getSurahDetail(surah.nomor);
      const data = response.data.data || response.data;
      setAyat(data.ayat || []);
      setShowSearch(false);
      setSearchQuery("");
    } catch (error) {
      console.error("Failed to load surah detail:", error);
    }
  };

  const handleAskAI = (surah: Surah) => {
    const message = `Tolong jelaskan tentang surah ${surah.nama_latin} dan ayat-ayat penting di dalamnya.`;
    navigate("/chat", { state: { prefillMessage: message } });
  };

  const handleSearchResultClick = (result: SearchResult) => {
    const surah = surahList.find(s => s.nomor === result.surah_number);
    if (surah) {
      loadSurahDetail(surah);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass border-b border-slate-700/30 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            {/* Logo & Nav */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-islamic-600 to-islamic-800 flex items-center justify-center shadow-islamic">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gradient-islamic">Al-Quran</h1>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => navigate("/chat")}
                  className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 btn-ghost"
                >
                  <MessageCircle className="w-4 h-4" />
                  Chat
                </button>
                <button
                  onClick={() => navigate("/quran")}
                  className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 bg-gradient-to-r from-islamic-600 to-islamic-500 text-white shadow-islamic"
                >
                  <BookOpen className="w-4 h-4" />
                  Al-Quran
                </button>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Cari ayat... (misal: sabar, shalat, rezeki)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSearch(true)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl input-modern"
                />
              </div>
              
              {/* Search Results Dropdown */}
              {showSearch && searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700/50 rounded-xl shadow-islamic-lg max-h-96 overflow-y-auto z-50 animate-slide-down">
                  {isSearching ? (
                    <div className="p-6 text-center text-slate-400">
                      <div className="w-6 h-6 border-2 border-islamic-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <span>Mencari...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="p-3">
                      <div className="text-xs text-slate-500 mb-3 px-2 flex items-center gap-2">
                        <Sparkles className="w-3 h-3" />
                        {searchResults.length} hasil ditemukan
                      </div>
                      {searchResults.map((result, index) => (
                        <div
                          key={index}
                          onClick={() => handleSearchResultClick(result)}
                          className="p-3 hover:bg-slate-800/80 rounded-xl cursor-pointer transition-all mb-1"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="badge-islamic">
                              QS. {result.surah}:{result.ayat}
                            </span>
                          </div>
                          <div className="text-slate-200 text-lg mb-2 font-arabic" dir="rtl">
                            {result.arab}
                          </div>
                          <div className="text-slate-400 text-sm">
                            "{result.terjemahan}"
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-400">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <span>Tidak ada hasil untuk "{searchQuery}"</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* User Section */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/30">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center">
                  <span className="text-sm font-semibold text-white">
                    {(user?.username || user?.email || "U")[0].toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-slate-300 hidden sm:block">
                  {user?.username || user?.email}
                </span>
              </div>
              
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Surah */}
        <aside className="w-80 flex-shrink-0 glass border-r border-slate-700/30 p-4 h-[calc(100vh-85px)] sticky top-[85px]">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-gold-400" />
            <h2 className="text-lg font-semibold">Daftar Surah</h2>
          </div>
          <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-180px)] pr-2">
            {surahList.map((surah) => (
              <button
                key={surah.nomor}
                onClick={() => loadSurahDetail(surah)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                  selectedSurah?.nomor === surah.nomor 
                    ? "surah-card-active" 
                    : "surah-card"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-medium text-slate-400">
                      {surah.nomor}
                    </div>
                    <div>
                      <div className="font-medium text-slate-200">
                        {surah.nama_latin}
                      </div>
                      <div className="text-sm text-slate-500">
                        {surah.nama}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-500">
                    {surah.jumlah_ayat} ayat
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="badge-islamic text-xs">
                    {surah.tempat_turun}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 min-h-[calc(100vh-85px)]">
          {selectedSurah ? (
            <>
              {/* Surah Header */}
              <div className="mb-8 animate-fade-in">
                <div className="card-islamic p-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-islamic-500 to-islamic-600 flex items-center justify-center shadow-islamic">
                          <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gradient-islamic">
                            Surah {selectedSurah.nama_latin}
                          </h2>
                          <p className="text-slate-400">
                            {selectedSurah.nama} • {selectedSurah.jumlah_ayat} ayat • {selectedSurah.tempat_turun}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAskAI(selectedSurah)}
                      className="btn-gold inline-flex items-center gap-2"
                    >
                      <Sparkles size={18} />
                      <span>Tanya AI tentang surah ini</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Ayat List */}
              <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 animate-stagger">
                {ayat.map((a) => (
                  <CitationCard
                    key={a.nomor}
                    surah={selectedSurah.nama_latin}
                    ayat={a.nomor}
                    arabic={a.ar}
                    translation={a.id_indonesia || a.idn}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[60vh]">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-islamic-500/20 to-gold-500/20 flex items-center justify-center">
                  <BookOpen className="w-12 h-12 text-islamic-400" />
                </div>
                <h2 className="text-2xl font-bold text-gradient-islamic mb-3">
                  Al-Quran Digital
                </h2>
                <p className="text-slate-400 mb-2">
                  Pilih surah dari daftar di samping untuk membaca ayat-ayatnya
                </p>
                <p className="text-slate-500 text-sm">
                  Atau gunakan fitur pencarian untuk menemukan ayat tertentu
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default QuranPage;
