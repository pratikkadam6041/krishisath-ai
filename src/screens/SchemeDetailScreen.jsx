import { ArrowLeft, CheckCircle2, ExternalLink } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { SCHEME_LIBRARY } from '../data/appContent.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { shareScheme } from '../utils/shareWhatsApp.js';
import { localize } from '../utils/formatters.js';

export default function SchemeDetailScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const language = useSettingsStore((state) => state.language);
  const scheme = SCHEME_LIBRARY.find((item) => item.id === id);

  if (!scheme) {
    return null;
  }

  return (
    <div className="min-h-[100dvh] bg-[#f4f9f2] px-4 pt-4 pb-8">
      <div className="mb-4 flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-text-primary">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-text-primary">{localize(scheme.name, language)}</h1>
          <p className="text-sm text-text-secondary">{scheme.department}</p>
        </div>
      </div>

      <div className="rounded-[28px] border border-border bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        <p className="text-sm text-text-secondary">{localize(scheme.summary, language)}</p>
        <div className="mt-5 rounded-2xl bg-[#f7faf5] p-4">
          <p className="text-sm font-black text-text-primary">
            {localize({ hi: 'आवेदन के लिए जरूरी चीजें', mr: 'अर्जासाठी लागणाऱ्या गोष्टी', en: 'What you need to apply' }, language)}
          </p>
          <div className="mt-3 space-y-3">
            {scheme.steps.map((step) => (
              <div key={step} className="flex items-center gap-3">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <span className="text-sm text-text-primary">{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <button
            type="button"
            onClick={() => window.open('https://www.india.gov.in/', '_blank', 'noopener,noreferrer')}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#1a3d1a] px-4 py-4 text-sm font-black text-white"
          >
            <ExternalLink size={16} />
            {localize({ hi: 'आधिकारिक साइट खोलें', mr: 'अधिकृत साइट उघडा', en: 'Open official website' }, language)}
          </button>
          <button
            type="button"
            onClick={() =>
              shareScheme({
                schemeName: localize(scheme.name, language),
                description: localize(scheme.summary, language),
                deadline: scheme.deadline,
              })
            }
            className="rounded-2xl border border-[#1a3d1a] px-4 py-4 text-sm font-black text-[#1a3d1a]"
          >
            {localize({ hi: 'WhatsApp पर शेयर करें', mr: 'WhatsApp वर शेअर करा', en: 'Share on WhatsApp' }, language)}
          </button>
        </div>
      </div>
    </div>
  );
}
