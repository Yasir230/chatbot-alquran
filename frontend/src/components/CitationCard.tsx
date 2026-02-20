import type { FC } from "react";
import { Bookmark, Copy, Check } from "lucide-react";
import { useState } from "react";

type Props = {
  surah: string;
  ayat: number;
  arabic: string;
  translation: string;
};

const CitationCard: FC<Props> = ({ surah, ayat, arabic, translation }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = `${surah} : ${ayat}\n${arabic}\n"${translation}"`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="verse-card group">
      <div className="flex items-start justify-between mb-3">
        <span className="badge-islamic inline-flex items-center gap-1">
          <Bookmark className="w-3 h-3" />
          {surah} : {ayat}
        </span>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-lg text-slate-500 hover:text-islamic-400 hover:bg-islamic-500/10 transition-all opacity-0 group-hover:opacity-100"
          title="Salin ayat"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <div className="text-right text-xl leading-loose text-slate-50 mb-4 font-arabic">{arabic}</div>
      <div className="text-slate-300 leading-relaxed border-t border-slate-700/30 pt-3">
        {translation}
      </div>
    </div>
  );
};

export default CitationCard;
