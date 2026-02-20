import type { FC } from "react";
import type { Message } from "@shared/types";
import { BookOpen, Clock } from "lucide-react";

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === "user";
  
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4 animate-fade-in`}>
      <div
        className={`max-w-[75%] rounded-2xl px-5 py-4 text-sm ${
          isUser 
            ? "bubble-user" 
            : "bubble-ai"
        }`}
      >
        <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
        
        {message.sources && message.sources.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-700/50">
            <div className="flex items-center gap-2 text-xs font-semibold text-islamic-300 mb-3">
              <BookOpen className="w-3 h-3" />
              Referensi Al-Quran
            </div>
            <div className="space-y-2">
              {message.sources?.map((source: any, index: number) => (
                <div key={index} className="bg-slate-900/60 rounded-xl p-3 text-xs border border-slate-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge-islamic">
                      QS. {source.surah}:{source.ayat}
                    </span>
                  </div>
                  <div className="text-slate-200 text-lg mb-2 font-arabic leading-loose" dir="rtl">
                    {source.arab}
                  </div>
                  <div className="text-slate-400 italic">
                    "{source.terjemahan}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-1 text-xs text-slate-500 mt-3">
          <Clock className="w-3 h-3" />
          {new Date(message.created_at).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
