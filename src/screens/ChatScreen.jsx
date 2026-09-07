import { useMemo } from 'react';
import { ArrowLeft, History, MessageSquareText, Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ChatBot from '../components/ChatBot.jsx';
import { useSettingsStore } from '../store/settingsStore.js';
import { formatRelativeTime, localize } from '../utils/formatters.js';

const FALLBACK_THREADS = [
  { id: 1, title: 'Wheat Rust Advice', preview: 'Spray Propiconazole 25 EC...', updatedAt: Date.now() - 86400000 },
  { id: 2, title: 'Irrigation Schedule', preview: 'Watering recommended tomorrow...', updatedAt: Date.now() - 172800000 }
];

export default function ChatScreen() {
  const navigate = useNavigate();
  const language = useSettingsStore((state) => state.language);

  const recentThreads = useMemo(() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem('kisanai-chat-conversations') || '[]');
      return parsed.length ? parsed : FALLBACK_THREADS;
    } catch {
      return FALLBACK_THREADS;
    }
  }, []);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#eef7f0]">
      <div className="border-b border-border bg-white/95 px-4 pt-4 pb-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-text-primary">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[#edf6ec] text-[#1a3d1a]">
                <MessageSquareText size={18} />
              </span>
              <h1 className="text-xl font-black text-text-primary">KisanAI</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#ecf7ed] px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#1a3d1a]">
                <Radio size={10} />
                {language === 'mr' ? 'सक्रिय' : language === 'en' ? 'Active' : 'सक्रिय'}
              </span>
            </div>
            <p className="text-sm text-text-secondary">
              {localize({ hi: 'आपकी भाषा में खेती सलाह', mr: 'तुमच्या भाषेत शेती सल्ला', en: 'Farming advice in your language' }, language)}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="mb-4 rounded-[24px] border border-border bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-text-primary">
            <History size={16} className="text-[#1a3d1a]" />
            {localize({ hi: 'हाल की बातचीत', mr: 'अलीकडील संभाषणे', en: 'Recent conversations' }, language)}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recentThreads.map((thread, index) => (
              <div key={`${thread.id}-${index}`} className="min-w-[220px] rounded-[20px] bg-[#f7faf5] p-4">
                <p className="text-sm font-black text-text-primary">{thread.title}</p>
                <p className="mt-2 text-sm text-text-secondary">{thread.preview}</p>
                <p className="mt-3 text-xs font-semibold text-slate-500">
                  {thread.updatedAt ? formatRelativeTime(thread.updatedAt, language) : localize({ hi: 'सहेजा गया', mr: 'जतन केलेले', en: 'Saved' }, language)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 pb-[96px]">
        <div className="h-full rounded-[28px] border border-border bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <ChatBot embedded />
        </div>
      </div>
    </div>
  );
}
