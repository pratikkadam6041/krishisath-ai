import { useMemo, useState } from 'react';
import {
  BadgeIndianRupee,
  BookOpenCheck,
  ChevronDown,
  Filter,
  Globe,
  GraduationCap,
  Landmark,
  ShieldCheck,
  Volume2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { SCHEME_LIBRARY } from '../data/appContent.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { useZoneStore } from '../store/zoneStore.js';
import { localize } from '../utils/formatters.js';

const CATEGORY_ORDER = ['all', 'subsidy', 'insurance', 'loan', 'training'];

const CATEGORY_LABELS = {
  all: { hi: 'सभी', mr: 'सर्व', en: 'All' },
  subsidy: { hi: 'सब्सिडी', mr: 'अनुदान', en: 'Subsidy' },
  insurance: { hi: 'बीमा', mr: 'विमा', en: 'Insurance' },
  loan: { hi: 'क्रेडिट', mr: 'कर्ज', en: 'Credit' },
  training: { hi: 'प्रशिक्षण', mr: 'प्रशिक्षण', en: 'Training' },
};

function getSchemeIcon(category) {
  switch (category) {
    case 'insurance':
      return <ShieldCheck size={22} className="text-sky-700" />;
    case 'loan':
      return <BadgeIndianRupee size={22} className="text-amber-700" />;
    case 'training':
      return <GraduationCap size={22} className="text-violet-700" />;
    case 'subsidy':
    default:
      return <Landmark size={22} className="text-emerald-700" />;
  }
}

export default function SchemesScreen() {
  const navigate = useNavigate();
  const language = useSettingsStore((state) => state.language);
  const district = useZoneStore((state) => state.district);
  const stateName = useZoneStore((state) => state.state);
  const [filter, setFilter] = useState('all');
  const [scope, setScope] = useState('state');

  const visibleSchemes = useMemo(
    () => (filter === 'all' ? SCHEME_LIBRARY : SCHEME_LIBRARY.filter((scheme) => scheme.category === filter)),
    [filter]
  );

  return (
    <div className="min-h-[100dvh] bg-[#f4f9f2] px-4 pt-4 pb-8">
      <div className="overflow-hidden rounded-[30px] bg-[linear-gradient(180deg,#0f2c15_0%,#156b2f_62%,#1f7d39_100%)] p-5 text-white shadow-[0_28px_80px_rgba(20,59,24,0.26)]">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-white/75">
              <BookOpenCheck size={13} />
              {localize({ hi: 'योजना खोज', mr: 'योजना शोध', en: 'Scheme finder' }, language)}
            </div>
            <h1 className="mt-4 text-[30px] font-black leading-none">
              {localize({ hi: 'सरकारी योजनाएं', mr: 'सरकारी योजना', en: 'Government schemes' }, language)}
            </h1>
            <p className="mt-2 text-sm text-white/75">
              {district}, {stateName}
            </p>
          </div>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white"
          >
            <Filter size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setScope('state')}
            className={`rounded-2xl px-4 py-3 text-sm font-black ${
              scope === 'state' ? 'bg-white text-[#145927]' : 'bg-white/10 text-white'
            }`}
          >
            {stateName || localize({ hi: 'राज्य', mr: 'राज्य', en: 'State' }, language)}
          </button>
          <button
            type="button"
            onClick={() => setScope('central')}
            className={`rounded-2xl px-4 py-3 text-sm font-black ${
              scope === 'central' ? 'bg-white text-[#145927]' : 'bg-white/10 text-white'
            }`}
          >
            {localize({ hi: 'केंद्र', mr: 'केंद्र', en: 'Central' }, language)}
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-[22px] bg-white/10 px-4 py-3 text-sm text-white/85">
          <span>
            {localize(
              {
                hi: `${visibleSchemes.length} योजनाएं आपके लिए चुनी गई हैं`,
                mr: `${visibleSchemes.length} योजना तुमच्यासाठी निवडल्या आहेत`,
                en: `${visibleSchemes.length} schemes shortlisted for you`,
              },
              language
            )}
          </span>
          <Globe size={15} />
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {CATEGORY_ORDER.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`rounded-full px-4 py-2 text-sm font-black whitespace-nowrap ${
              filter === item ? 'bg-[#1a3d1a] text-white' : 'bg-white text-text-secondary'
            }`}
          >
            {localize(CATEGORY_LABELS[item], language)}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {visibleSchemes.map((scheme) => (
          <div
            key={scheme.id}
            className="rounded-[28px] border border-border bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]"
          >
            <div className="mb-4 flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#f5faf4] ring-1 ring-[#dce8d8]">
                {getSchemeIcon(scheme.category)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black leading-7 text-text-primary">{localize(scheme.name, language)}</h2>
                    <p className="mt-1 text-sm text-text-secondary">{scheme.department}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-[#edf6ec] text-[#1a3d1a]"
                    >
                      <Volume2 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/schemes/${scheme.id}`)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f8f4] text-text-secondary"
                    >
                      <ChevronDown size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-2 text-xs font-black ${
                  scheme.eligible ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {scheme.eligible
                  ? localize({ hi: 'पात्र', mr: 'पात्र', en: 'Eligible' }, language)
                  : localize({ hi: 'जांचें', mr: 'तपासा', en: 'Check' }, language)}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">
                {scope === 'central'
                  ? localize({ hi: 'केंद्रीय', mr: 'केंद्रीय', en: 'Central' }, language)
                  : stateName || localize({ hi: 'राज्य', mr: 'राज्य', en: 'State' }, language)}
              </span>
              {scheme.deadline ? (
                <span className="rounded-full bg-red-50 px-3 py-2 text-xs font-black text-red-600">
                  {localize({ hi: 'अंतिम तिथि', mr: 'शेवटची तारीख', en: 'Deadline' }, language)}: {scheme.deadline}
                </span>
              ) : null}
            </div>

            <p className="text-sm leading-6 text-text-secondary">{localize(scheme.summary, language)}</p>

            <div className="mt-4 rounded-[22px] bg-[#f7faf5] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary">
                {localize({ hi: 'आवेदन के लिए चाहिए', mr: 'अर्जासाठी लागेल', en: 'What you need' }, language)}
              </p>
              <div className="mt-3 space-y-2">
                {scheme.steps.slice(0, 3).map((step) => (
                  <div key={step} className="flex items-start gap-2 text-sm text-text-secondary">
                    <span className="mt-1 h-2 w-2 rounded-full bg-[#1a3d1a]" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => navigate(`/schemes/${scheme.id}`)}
                className="rounded-2xl border border-[#1a3d1a] px-4 py-3 text-sm font-black text-[#1a3d1a]"
              >
                {localize({ hi: 'विवरण देखें', mr: 'तपशील पाहा', en: 'View details' }, language)}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/schemes/${scheme.id}`)}
                className="rounded-2xl bg-[#1a3d1a] px-4 py-3 text-sm font-black text-white shadow-[0_14px_28px_rgba(26,61,26,0.18)]"
              >
                {localize({ hi: 'अभी आवेदन करें', mr: 'आत्ताच अर्ज करा', en: 'Apply now' }, language)}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
