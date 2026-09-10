import { useMemo } from 'react';
import { ArrowLeft, History, MessageSquareText, Mic, Radio, ShieldCheck, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import ChatBot from '../components/ChatBot.jsx';
import { useSettingsStore } from '../store/settingsStore.js';
import { formatRelativeTime, localize } from '../utils/formatters.js';

function getFallbackThreads(language) {
  return [
    {
      id: 1,
      title: localize({ hi: 'Krishi AI चैट', mr: 'Krishi AI चॅट', en: 'Krishi AI chat' }, language),
      preview: localize({ hi: 'अपना खेती का सवाल बोलें या लिखें।', mr: 'तुमचा शेतीचा प्रश्न बोला किंवा लिहा.', en: 'Speak or type a question about your farm.' }, language),
      updatedAt: Date.now(),
    },
  ];
}

export default function ChatScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const language = useSettingsStore((state) => state.language);
  const voiceRequested = new URLSearchParams(location.search).get('voice') === '1';

  const recentThreads = useMemo(() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem('kisanai-chat-conversations') || '[]');
      const matchingLanguage = parsed.filter((thread) => thread.language === language);
      return matchingLanguage.length ? matchingLanguage : getFallbackThreads(language);
    } catch {
      return getFallbackThreads(language);
    }
  }, [language]);

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
              <h1 className="text-xl font-black text-text-primary">Krishi AI</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#ecf7ed] px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#1a3d1a]">
                <Radio size={10} />
                {language === 'mr' ? 'सक्रिय' : language === 'en' ? 'Active' : 'सक्रिय'}
              </span>
            </div>
            <p className="text-sm text-text-secondary">
              {localize({ hi: 'आपकी भाषा में बातचीत करने वाला खेत साथी', mr: 'तुमच्या भाषेत संवाद करणारा शेत साथी', en: 'A farm companion that talks in your language' }, language)}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="mb-4 overflow-hidden rounded-[24px] border border-emerald-200 bg-[radial-gradient(circle_at_top_right,_#d9f8e5,_#f7fdf8_55%,_#eef8f0)] p-4 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1a3d1a] text-white shadow-lg shadow-emerald-900/15">
              <Sparkles size={20} />
            </span>
            <div>
              <p className="text-sm font-black text-[#12351b]">
                {localize({ hi: 'Krishi AI बात करने के लिए तैयार है', mr: 'Krishi AI संवादासाठी तयार आहे', en: 'Krishi AI is ready to talk' }, language)}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#426249]">
                {localize({ hi: 'नीचे माइक दबाएं। Krishi आपके मौसम, फसल, मिट्टी और मंडी संदर्भ को समझकर जवाब देता है।', mr: 'खालील माइक दाबा. Krishi हवामान, पीक, माती आणि मंडीचा संदर्भ समजून उत्तर देतो.', en: 'Tap the microphone below. Krishi answers with your weather, crop, soil and Mandi context.' }, language)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wide text-[#1a6030]">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/85 px-2.5 py-1"><Mic size={12} /> {localize({ hi: 'बोलकर पूछें', mr: 'बोलून विचारा', en: 'Tap to talk' }, language)}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/85 px-2.5 py-1"><ShieldCheck size={12} /> {localize({ hi: 'पहले पुष्टि', mr: 'आधी पुष्टी', en: 'Actions need approval' }, language)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mb-4 rounded-[24px] border border-border bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-text-primary">
            <History size={16} className="text-[#1a3d1a]" />
            {localize({ hi: 'हाल की बातचीत', mr: 'अलीकडील संभाषणे', en: 'Recent conversations' }, language)}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recentThreads.map((thread, index) => (
              <div key={`${thread.id}-${index}`} className="min-w-[220px] rounded-[20px] bg-[#f7faf5] p-4">
                <p className="text-sm font-black text-text-primary">{thread.title}</p>
                <p className="mt-2 text-sm text-text-secondary">
                  {thread.preview || localize({ hi: 'अपना खेती का सवाल बोलें या लिखें।', mr: 'तुमचा शेतीचा प्रश्न बोला किंवा लिहा.', en: 'Speak or type a question about your farm.' }, language)}
                </p>
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
          <ChatBot embedded startVoice={voiceRequested} />
        </div>
      </div>
    </div>
  );
}
