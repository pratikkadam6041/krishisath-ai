import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../store/settingsStore.js';
import { Check } from 'lucide-react';

const LANGUAGES = [
  { code: 'mr', label: 'मराठी', sub: 'Marathi', flag: '🇮🇳' },
  { code: 'hi', label: 'हिंदी', sub: 'Hindi',   flag: '🇮🇳' },
  { code: 'en', label: 'English', sub: 'English', flag: '🇮🇳' },
];

export default function LanguageSwitcher({ onChanged } = {}) {
  const { t, i18n } = useTranslation();
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const current = i18n.language;

  const handleChange = (code) => {
    setLanguage(code);
    onChanged?.(code);
  };

  return (
    <div className="flex gap-3" id="language-switcher">
      {LANGUAGES.map(({ code, label, sub }) => {
        const active = current === code;
        return (
          <button
            key={code}
            id={`lang-btn-${code}`}
            onClick={() => handleChange(code)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-4 px-3 rounded-xl border-2 transition-all duration-200 touch-target ${
              active
                ? 'border-primary bg-primary bg-opacity-10 shadow-sm'
                : 'border-border bg-white hover:border-primary hover:bg-primary hover:bg-opacity-5'
            }`}
            style={{ minHeight: 80 }}
            aria-label={label}
            aria-pressed={active}
          >
            <span className={`text-lg font-bold ${active ? 'text-primary' : 'text-text-primary'}`}>
              {label}
            </span>
            <span className="text-xs text-text-secondary">{sub}</span>
            {active && (
              <span className="mt-1 bg-primary text-white rounded-full p-0.5">
                <Check size={10} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
