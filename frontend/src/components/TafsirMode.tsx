import { useState } from "react";
import { BookOpen, X, Send, Lightbulb, Sparkles, Loader2 } from "lucide-react";
import { chatApi } from "../services/api";

interface TafsirModeProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (message: string) => void;
}

export default function TafsirMode({ isOpen, onClose, onSendMessage }: TafsirModeProps) {
  const [surahNumber, setSurahNumber] = useState("");
  const [ayatNumber, setAyatNumber] = useState("");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [discussion, setDiscussion] = useState<any>(null);

  const handleStartDiscussion = async () => {
    if (!surahNumber || !ayatNumber) return;

    setLoading(true);
    try {
      const response = await chatApi.startTafsir({
        surahNumber: parseInt(surahNumber),
        ayatNumber: parseInt(ayatNumber),
      });

      if (response.data) {
        setDiscussion(response.data);
      }
    } catch (error) {
      console.error("Failed to start tafsir discussion:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!question || !discussion) return;

    setLoading(true);
    try {
      const response = await chatApi.askTafsir({
        surahNumber: discussion.surahNumber,
        ayatNumber: discussion.ayatNumber,
        question,
      });

      if (response.data) {
        onSendMessage(`Tafsir QS. ${discussion.surahNumber}:${discussion.ayatNumber} - ${question}\n\n${response.data.answer}`);
        setQuestion("");
      }
    } catch (error) {
      console.error("Failed to ask tafsir question:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickTafsir = () => {
    const message = `Tafsir QS. ${surahNumber}:${ayatNumber}`;
    onSendMessage(message);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="overlay-dark flex items-center justify-center p-4">
      <div className="modal-islamic p-6 w-full max-w-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-700/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center shadow-gold">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Mode Tafsir</h2>
              <p className="text-xs text-slate-500">Diskusi tafsir ayat Al-Quran</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!discussion ? (
          /* Setup Form */
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nomor Surah
                </label>
                <input
                  type="number"
                  min="1" max="114"
                  value={surahNumber}
                  onChange={(e) => setSurahNumber(e.target.value)}
                  className="input-modern"
                  placeholder="Contoh: 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nomor Ayat
                </label>
                <input
                  type="number"
                  min="1"
                  value={ayatNumber}
                  onChange={(e) => setAyatNumber(e.target.value)}
                  className="input-modern"
                  placeholder="Contoh: 1"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleStartDiscussion}
                disabled={!surahNumber || !ayatNumber || loading}
                className="flex-1 btn-gold flex items-center justify-center gap-2 py-3 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Memuat...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Mulai Diskusi</span>
                  </>
                )}
              </button>
              <button
                onClick={handleQuickTafsir}
                disabled={!surahNumber || !ayatNumber}
                className="px-6 py-3 rounded-xl border border-gold-500/30 text-gold-400 hover:bg-gold-500/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Tafsir Cepat
              </button>
            </div>

            <p className="text-xs text-slate-500 text-center">
              Masukkan nomor surah dan ayat untuk memulai diskusi tafsir
            </p>
          </div>
        ) : (
          /* Discussion Mode */
          <div className="space-y-5">
            {/* Verse Display */}
            <div className="card-islamic p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="badge-gold">
                  QS. {discussion.surahNumber}:{discussion.ayatNumber}
                </span>
              </div>
              <div className="text-right text-xl mb-4 font-arabic leading-loose text-slate-100">
                {discussion.arabicText}
              </div>
              <div className="text-slate-300 mb-3 leading-relaxed border-t border-slate-700/30 pt-3">
                <span className="text-slate-500">Terjemahan:</span> {discussion.translation}
              </div>
              {discussion.tafsir && (
                <div className="p-3 rounded-xl bg-gold-500/10 border border-gold-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-gold-400" />
                    <span className="text-sm font-medium text-gold-300">Tafsir Ringkas</span>
                  </div>
                  <div className="text-sm text-slate-300">
                    {discussion.tafsir}
                  </div>
                </div>
              )}
            </div>

            {/* Discussion Points */}
            {discussion.discussionPoints.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/30">
                <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-islamic-400" />
                  Topik Diskusi
                </h4>
                <ul className="space-y-2">
                  {discussion.discussionPoints.map((point: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-islamic-500 mt-1.5 flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Question Input */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                Pertanyaan Anda:
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="input-modern"
                rows={3}
                placeholder="Contoh: Apa maksud dari kata 'ar-Rahman' dalam ayat ini?"
              />
              <button
                onClick={handleAskQuestion}
                disabled={!question || loading}
                className="w-full btn-gold flex items-center justify-center gap-2 py-3 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Menjawab...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Tanya Tafsir</span>
                  </>
                )}
              </button>
            </div>

            {/* Back Button */}
            <button
              onClick={() => setDiscussion(null)}
              className="w-full btn-ghost py-2"
            >
              Pilih Ayat Lain
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
