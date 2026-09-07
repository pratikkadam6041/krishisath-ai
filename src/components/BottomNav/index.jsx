import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Scan, MessageCircle, Settings, Network } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore.js';
import { useAdminStore } from '../../store/adminStore.js';
import { localize } from '../../utils/formatters.js';

const TABS = [
  {
    key: 'home',
    path: '/',
    icon: Home,
    label: { hi: 'होम', mr: 'होम', en: 'Home' },
  },
  {
    key: 'twin',
    path: '/twin',
    icon: Network,
    label: { hi: 'ट्विन', mr: 'ट्विन', en: 'Twin' },
  },
  {
    key: 'scanner',
    path: '/scanner',
    icon: Scan,
    label: { hi: 'स्कैन', mr: 'स्कॅन', en: 'Scan' },
    size: 24,
  },
  {
    key: 'chat',
    path: '/chat',
    icon: MessageCircle,
    label: { hi: 'चैट', mr: 'चॅट', en: 'Chat' },
  },
  {
    key: 'settings',
    path: '/settings',
    icon: Settings,
    label: { hi: 'सेटिंग्स', mr: 'सेटिंग्स', en: 'Setup' },
  },
];

export default function BottomNav({ immersive = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const language = useSettingsStore((state) => state.language);
  const features = useAdminStore((state) => state.features || { scannerEnabled: true, twinEnabled: true, mandiEnabled: true });

  const activeTabs = TABS.filter(tab => {
    if (tab.key === 'twin') return features.twinEnabled;
    if (tab.key === 'scanner') return features.scannerEnabled;
    return true;
  });

  return (
    <nav
      className={`bottom-nav px-3 pt-2 backdrop-blur-xl ${
        immersive
          ? 'absolute bottom-0 left-0 right-0 z-[60] h-[82px] border-t border-white/10 bg-[rgba(10,15,20,0.92)] shadow-[0_-12px_40px_rgba(0,0,0,0.45)]'
          : 'h-[82px] border-t border-slate-200/90 bg-white/95 shadow-[0_-18px_48px_rgba(15,23,42,0.08)]'
      }`}
    >
      {activeTabs.map(({ key, path, icon: Icon, label, size = 22 }) => {
        const active = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

        return (
          <button
            key={key}
            type="button"
            onClick={() => navigate(path)}
            className={`relative flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1 rounded-[20px] transition ${
              immersive
                ? active
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'text-slate-500'
                : active
                ? 'bg-[#eef6ed] text-[#1a3d1a]'
                : 'text-slate-400'
            }`}
          >
            <div className="flex flex-col items-center">
              <span
                className={`mb-1 inline-flex h-9 w-9 items-center justify-center rounded-2xl ${
                  active ? 'bg-white shadow-[0_10px_24px_rgba(26,61,26,0.12)]' : 'bg-transparent'
                }`}
              >
                <Icon size={size} />
              </span>
              <span className={`text-[10px] font-black tracking-[0.14em] ${active ? 'text-[#1a3d1a]' : 'text-slate-400'}`}>
                {localize(label, language)}
              </span>
            </div>
            {active && (
              <span className="absolute bottom-1.5 h-1.5 w-8 rounded-full bg-[#1a3d1a]" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
