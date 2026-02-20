import { useState } from "react";
import { Brain, X, Play, BarChart3, Lightbulb, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { chatApi } from "../services/api";

interface HafalanModeProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HafalanMode({ isOpen, onClose }: HafalanModeProps) {
  const [sessionId, setSessionId] = useState<string>("");
  const [startSurah, setStartSurah] = useState("1");
  const [startAyat, setStartAyat] = useState("1");
  const [mode, setMode] = useState<'forward' | 'backward' | 'random'>('forward');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [loading, setLoading] = useState(false);
  const [currentVerse, setCurrentVerse] = useState<any>(null);
  const [userInput, setUserInput] = useState("");
  const [evaluation, setEvaluation] = useState<any>(null);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const handleStartSession = async () => {
    setLoading(true);
    try {
      const response = await chatApi.startHafalan({
        startSurah: parseInt(startSurah),
        startAyat: parseInt(startAyat),
        mode,
        difficulty,
      });

      if (response.data.sessionId) {
        setSessionId(response.data.sessionId);
        await getNextVerse(response.data.sessionId);
      }
    } catch (error) {
      console.error("Failed to start hafalan session:", error);
    } finally {
      setLoading(false);
    }
  };

  const getNextVerse = async (sid: string) => {
    try {
      const response = await chatApi.getNextVerse(sid);
      if (response.data) {
        setCurrentVerse(response.data);
        setUserInput("");
        setEvaluation(null);
      }
    } catch (error) {
      console.error("Failed to get next verse:", error);
    }
  };

  const handleEvaluate = async () => {
    if (!userInput || !currentVerse) return;

    setLoading(true);
    try {
      const response = await chatApi.evaluateHafalan({
        sessionId,
        userInput,
        surahNumber: currentVerse.surahNumber,
        ayatNumber: currentVerse.ayatNumber,
      });

      if (response.data) {
        setEvaluation(response.data);
        
        if (response.data.isCorrect && response.data.nextVerse) {
          setCurrentVerse(response.data.nextVerse);
          setUserInput("");
          setEvaluation(null);
        }
      }
    } catch (error) {
      console.error("Failed to evaluate hafalan:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetStats = async () => {
    try {
      const response = await chatApi.getHafalanStats(sessionId);
      if (response.data) {
        setStats(response.data);
        setShowStats(true);
      }
    } catch (error) {
      console.error("Failed to get stats:", error);
    }
  };

  const handleEndSession = async () => {
    try {
      await chatApi.endHafalan(sessionId);
    } catch (error) {
      console.error("Failed to end session:", error);
    }
    
    setSessionId("");
    setCurrentVerse(null);
    setUserInput("");
    setEvaluation(null);
  };

  if (!isOpen) return null;

  return (
    <div className="overlay-dark flex items-center justify-center p-4">
      <div className="modal-islamic p-6 w-full max-w-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-700/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Mode Hafalan</h2>
              <p className="text-xs text-slate-500">Latihan menghafal ayat Al-Quran</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!sessionId ? (
          /* Setup Form */
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Surah Awal
                </label>
                <input
                  type="number"
                  min="1" max="114"
                  value={startSurah}
                  onChange={(e) => setStartSurah(e.target.value)}
                  className="input-modern"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Ayat Awal
                </label>
                <input
                  type="number"
                  min="1"
                  value={startAyat}
                  onChange={(e) => setStartAyat(e.target.value)}
                  className="input-modern"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Mode
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as any)}
                  className="input-modern"
                >
                  <option value="forward">Maju (Forward)</option>
                  <option value="backward">Mundur (Backward)</option>
                  <option value="random">Acak (Random)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tingkat Kesulitan
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="input-modern"
                >
                  <option value="easy">Mudah (Easy)</option>
                  <option value="medium">Menengah (Medium)</option>
                  <option value="hard">Sulit (Hard)</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleStartSession}
              disabled={loading}
              className="w-full btn-islamic flex items-center justify-center gap-2 py-3"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memulai...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>Mulai Latihan Hafalan</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Practice Mode */
          <div className="space-y-5">
            {/* Status Bar */}
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-800/50 border border-slate-700/30">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-400">
                  Mode: <span className="text-slate-200 font-medium">{mode}</span>
                </span>
                <span className="text-slate-400">
                  Tingkat: <span className="text-slate-200 font-medium">{difficulty}</span>
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleGetStats}
                  className="px-3 py-1.5 text-sm rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-all flex items-center gap-1"
                >
                  <BarChart3 className="w-3 h-3" />
                  Statistik
                </button>
                <button
                  onClick={handleEndSession}
                  className="px-3 py-1.5 text-sm rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                >
                  Akhiri
                </button>
              </div>
            </div>

            {/* Current Verse */}
            {currentVerse && (
              <div className="card-islamic p-6">
                <div className="text-right text-2xl mb-4 font-arabic leading-loose text-slate-100">
                  {currentVerse.arabicText}
                </div>
                {currentVerse.hint && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-gold-500/10 border border-gold-500/20 mb-3">
                    <Lightbulb className="w-4 h-4 text-gold-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-gold-300">
                      <span className="font-medium">Petunjuk:</span> {currentVerse.hint}
                    </div>
                  </div>
                )}
                <div className="text-sm text-slate-400">
                  <span className="text-slate-500">Terjemahan:</span> {currentVerse.translation}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                Tulis Ayat (Arab):
              </label>
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className="input-modern font-arabic text-lg"
                rows={3}
                placeholder="Tulis ayat di sini..."
                dir="rtl"
              />
              <button
                onClick={handleEvaluate}
                disabled={!userInput || loading}
                className="w-full btn-islamic py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Mengevaluasi..." : "Evaluasi Hafalan"}
              </button>
            </div>

            {/* Evaluation Result */}
            {evaluation && (
              <div className={`p-5 rounded-xl border ${
                evaluation.isCorrect 
                  ? "bg-green-500/10 border-green-500/20" 
                  : "bg-yellow-500/10 border-yellow-500/20"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {evaluation.isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-yellow-400" />
                  )}
                  <div className={`font-medium ${
                    evaluation.isCorrect ? "text-green-400" : "text-yellow-400"
                  }`}>
                    {evaluation.feedback}
                  </div>
                </div>
                <div className="text-sm text-slate-400 mb-3">
                  Skor kemiripan: <span className="text-slate-200 font-medium">{(evaluation.similarityScore * 100).toFixed(1)}%</span>
                </div>
                {!evaluation.isCorrect && (
                  <div className="p-3 rounded-lg bg-slate-800/50">
                    <span className="text-sm text-slate-400">Ayat yang benar:</span>
                    <div className="text-right text-lg font-arabic mt-1 text-slate-200">
                      {evaluation.correctText}
                    </div>
                  </div>
                )}
                {!evaluation.isCorrect && evaluation.nextVerse && (
                  <button
                    onClick={() => {
                      setCurrentVerse(evaluation.nextVerse);
                      setUserInput("");
                      setEvaluation(null);
                    }}
                    className="mt-3 w-full btn-ghost flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Coba Lagi / next Verse
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stats Modal */}
        {showStats && stats && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-60 p-4">
            <div className="card-islamic p-6 w-full max-w-md animate-scale-in">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-islamic-400" />
                  Statistik Hafalan
                </h3>
                <button
                  onClick={() => setShowStats(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between p-3 rounded-xl bg-slate-800/50">
                  <span className="text-slate-400">Total Percobaan</span>
                  <span className="font-semibold text-slate-200">{stats.totalAttempts}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-slate-800/50">
                  <span className="text-slate-400">Percobaan Benar</span>
                  <span className="font-semibold text-green-400">{stats.correctAttempts}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-slate-800/50">
                  <span className="text-slate-400">Akurasi</span>
                  <span className="font-semibold text-slate-200">{stats.accuracy.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-slate-800/50">
                  <span className="text-slate-400">Skor Rata-rata</span>
                  <span className="font-semibold text-slate-200">{(stats.averageScore * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-slate-800/50">
                  <span className="text-slate-400">Progress</span>
                  <span className="font-semibold text-islamic-400">{stats.currentProgress.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
