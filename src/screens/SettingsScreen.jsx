import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  Camera,
  Cpu,
  Globe,
  Lock,
  MapPin,
  MessageCircle,
  QrCode,
  Ruler,
  Shield,
  Sparkles,
  Trash2,
  UserCircle2,
  Star,
} from 'lucide-react';

import BrandLogo from '../components/BrandLogo.jsx';
import CropAvatar from '../components/CropAvatar.jsx';
import { useAuthStore } from '../store/authStore.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { useZoneStore } from '../store/zoneStore.js';
import { shareWhatsApp } from '../utils/shareWhatsApp.js';
import { getCropMeta } from '../data/appContent.js';
import { pickProfileImage } from '../utils/profilePhoto.js';
import { formatArea, localize, toInitials } from '../utils/formatters.js';

const LANGUAGE_OPTIONS = [
  { value: 'hi', label: 'हिंदी' },
  { value: 'mr', label: 'मराठी' },
  { value: 'en', label: 'English' },
];

const UNIT_OPTIONS = [
  { value: 'acre', label: 'Acre' },
  { value: 'bigha', label: 'Bigha' },
  { value: 'guntha', label: 'Guntha' },
];

const NOTIFICATION_COPY = {
  moisture: {
    label: { hi: 'नमी अपडेट', mr: 'ओलावा अपडेट', en: 'Moisture updates' },
    description: {
      hi: 'जब खेत सूखने लगे या स्थिति बदले',
      mr: 'शेत सुकू लागल्यावर किंवा स्थिती बदलल्यावर',
      en: 'When field moisture changes or turns critical',
    },
  },
  schemes: {
    label: { hi: 'सरकारी योजनाएं', mr: 'सरकारी योजना', en: 'Government schemes' },
    description: {
      hi: 'नई योजना, पात्रता और समय सीमा',
      mr: 'नवीन योजना, पात्रता आणि अंतिम तारीख',
      en: 'New scheme updates, eligibility and deadlines',
    },
  },
  pests: {
    label: { hi: 'कीट और रोग', mr: 'कीड आणि रोग', en: 'Pests and disease' },
    description: {
      hi: 'रोग या कीट जोखिम होने पर',
      mr: 'रोग किंवा किडीचा धोका असल्यास',
      en: 'When a pest or disease threat is detected',
    },
  },
  mandi: {
    label: { hi: 'मंडी भाव', mr: 'मंडी भाव', en: 'Mandi prices' },
    description: {
      hi: 'दाम बदलने पर मंडी अपडेट',
      mr: 'भाव बदलल्यावर मंडी अपडेट',
      en: 'Price movement and mandi alerts',
    },
  },
  pumps: {
    label: { hi: 'पंप गतिविधि', mr: 'पंप क्रिया', en: 'Pump activity' },
    description: {
      hi: 'पंप चालू, बंद या कतार कमांड',
      mr: 'पंप सुरू, बंद किंवा रांगेतील कमांड',
      en: 'Pump on, off, and queued commands',
    },
  },
};

function buildFarmerId({ userName, district, totalAcres, crops }) {
  const namePart = (userName || 'KISAN').replace(/\s+/g, '').slice(0, 3).toUpperCase();
  const districtPart = (district || 'FARM').replace(/\s+/g, '').slice(0, 3).toUpperCase();
  const areaPart = String(Math.round((totalAcres || 0) * 10)).padStart(3, '0');
  const cropPart = (crops?.[0] || 'crop').slice(0, 2).toUpperCase();
  return `KS-${districtPart}-${namePart}-${cropPart}${areaPart}`;
}

function ProfileQrPattern({ seed }) {
  const cells = Array.from({ length: 25 }, (_, index) => {
    const charCode = seed.charCodeAt(index % seed.length) || 0;
    return (charCode + index) % 3 !== 0;
  });

  return (
    <div className="grid h-16 w-16 grid-cols-5 gap-1 rounded-2xl bg-white/20 p-2">
      {cells.map((active, index) => (
        <div key={index} className={`rounded-sm ${active ? 'bg-white' : 'bg-transparent'}`} />
      ))}
    </div>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#edf6ec] text-[#1a3d1a]">
        {icon}
      </div>
      <h2 className="text-lg font-black text-text-primary">{title}</h2>
    </div>
  );
}

function PreferencePillGroup({ options, value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-2xl px-3 py-3 text-sm font-black transition ${value === option.value
              ? 'bg-[#1a3d1a] text-white shadow-[0_10px_24px_rgba(26,61,26,0.18)]'
              : 'bg-[#f5f8f4] text-text-secondary'
            }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function SettingsScreen() {
  const navigate = useNavigate();
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const units = useSettingsStore((state) => state.units);
  const setUnits = useSettingsStore((state) => state.setUnits);
  const notificationPrefs = useSettingsStore((state) => state.notificationPrefs);
  const toggleNotification = useSettingsStore((state) => state.toggleNotification);
  const supportPhone = useSettingsStore((state) => state.supportPhone);
  const profilePhoto = useSettingsStore((state) => state.profilePhoto);
  const updateProfile = useSettingsStore((state) => state.updateProfile);
  const farmName = useZoneStore((state) => state.farmName);
  const zoneUserName = useZoneStore((state) => state.userName);
  const authFirstName = useAuthStore((state) => state.firstName);
  const userName = zoneUserName || authFirstName || 'Kisan';
  const village = useZoneStore((state) => state.village);
  const district = useZoneStore((state) => state.district);
  const stateName = useZoneStore((state) => state.state);
  const totalAcres = useZoneStore((state) => state.totalAcres);
  const selectedCrops = useZoneStore((state) => state.selectedCrops);
  const zoneMap = useZoneStore((state) => state.zones);
  const switchAccount = useAuthStore((state) => state.switchAccount);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const zones = useMemo(() => Object.values(zoneMap), [zoneMap]);
  const farmerId = useMemo(
    () => buildFarmerId({ userName, district, totalAcres, crops: selectedCrops }),
    [district, selectedCrops, totalAcres, userName]
  );

  const aiSummary = useMemo(() => {
    const cropNames = selectedCrops
      .slice(0, 2)
      .map((cropId) => localize(getCropMeta(cropId).name, language))
      .join(' + ');

    return localize(
      {
        hi: `${district} जिले में आपका ${formatArea(totalAcres, units, language)} खेत ${cropNames || 'मुख्य फसलों'} के साथ ${zones.length} ज़ोन में संगठित है। यह प्रोफाइल मौसम, मंडी और सिंचाई सलाह को और सटीक बनाती है।`,
        mr: `${district} जिल्ह्यातील तुमचे ${formatArea(totalAcres, units, language)} शेत ${cropNames || 'मुख्य पिकांसह'} ${zones.length} झोनमध्ये व्यवस्थित आहे. ही प्रोफाइल हवामान, बाजारभाव आणि सिंचन सल्ला अधिक अचूक करते.`,
        en: `Your ${formatArea(totalAcres, units, language)} farm in ${district} is organized across ${zones.length} zones with ${cropNames || 'your main crops'}. This profile helps improve weather, mandi, and irrigation guidance.`,
      },
      language
    );
  }, [district, language, selectedCrops, totalAcres, units, zones.length]);

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="overflow-hidden rounded-[34px] bg-[linear-gradient(145deg,#1b5b25_0%,#1c7c34_48%,#17491d_100%)] text-white shadow-[0_28px_80px_rgba(26,61,26,0.28)]">
        <div className="relative p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(163,230,53,0.18),transparent_36%)]" />
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-3 flex items-center gap-3">
                  <BrandLogo size={44} rounded="rounded-[14px]" shadow={false} imageClassName="ring-1 ring-white/10" />
                  <div>
                    <p className="text-sm font-black tracking-[0.1em] text-white/95">KRISHISARTH 2.0</p>
                    <p className="text-xs text-white/70">
                      {localize({ hi: 'भारतीय किसानों को सशक्त बनाना', mr: 'भारतीय शेतकऱ्यांना सक्षम करणे', en: 'Empowering Indian Farmers' }, language)}
                    </p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/85">
                  <BadgeCheck size={14} />
                  {localize({ hi: 'सत्यापित किसान', mr: 'सत्यापित शेतकरी', en: 'Verified farmer' }, language)}
                </div>
                <h1 className="mt-4 text-[30px] font-black leading-none">{userName}</h1>
                <p className="mt-2 text-sm text-white/78">
                  {village}, {district}, {stateName}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedCrops.slice(0, 3).map((cropId) => (
                    <div
                      key={cropId}
                      className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm font-bold text-white"
                    >
                      <CropAvatar cropId={cropId} size="xs" />
                      <span>{localize(getCropMeta(cropId).name, language)}</span>
                    </div>
                  ))}
                  <div className="rounded-full bg-white/10 px-3 py-2 text-sm font-bold text-white">
                    {formatArea(totalAcres, units, language)}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3">
                <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white/70 bg-white/10 text-3xl font-black text-white">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="" className="h-full w-full object-cover" />
                  ) : (
                    toInitials(userName)
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      pickProfileImage().then((dataUrl) => updateProfile({ profilePhoto: dataUrl }))
                    }
                    className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#1a3d1a] shadow-lg"
                    aria-label="Upload profile photo"
                  >
                    <Camera size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-[1fr_auto] gap-4 rounded-[28px] bg-white/10 p-4 backdrop-blur-sm">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-white/80">
                  <QrCode size={16} />
                  <span>{localize({ hi: 'डिजिटल फार्म आईडी', mr: 'डिजिटल फार्म आयडी', en: 'Digital farm ID' }, language)}</span>
                </div>
                <p className="mt-2 text-sm font-black tracking-[0.18em] text-white/95">{farmerId}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-white/75">
                  <span className="rounded-full bg-white/10 px-3 py-2">{farmName}</span>
                  <span className="rounded-full bg-white/10 px-3 py-2">{zones.length} zones</span>
                </div>
              </div>
              <ProfileQrPattern seed={farmerId} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[28px] border border-[#d9e8d5] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-[5px] border-[#49b556] text-center">
            <div>
              <p className="text-lg font-black text-[#1a3d1a]">90%</p>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-text-secondary">
                {localize({ hi: 'स्कोर', mr: 'स्कोर', en: 'Score' }, language)}
              </p>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2 text-sm font-black text-[#1a3d1a]">
              <Sparkles size={16} />
              <span>{localize({ hi: 'AI किसान सारांश', mr: 'AI शेतकरी सारांश', en: 'AI farmer summary' }, language)}</span>
            </div>
            <p className="text-sm leading-6 text-text-secondary">{aiSummary}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[28px] border border-border bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        <SectionTitle
          icon={<Ruler size={18} />}
          title={localize({ hi: 'खेत विवरण', mr: 'शेत तपशील', en: 'Farm details' }, language)}
        />

        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: localize({ hi: 'फार्म', mr: 'फार्म', en: 'Farm' }, language),
              value: farmName,
            },
            {
              label: localize({ hi: 'क्षेत्रफल', mr: 'क्षेत्रफळ', en: 'Area' }, language),
              value: formatArea(totalAcres, units, language),
            },
            {
              label: localize({ hi: 'ज़ोन', mr: 'झोन', en: 'Zones' }, language),
              value: zones.length,
            },
            {
              label: localize({ hi: 'सिस्टम', mr: 'सिस्टम', en: 'Mode' }, language),
              value: zones.some((zone) => zone.zoneType === 'sensor')
                ? localize({ hi: 'सेंसर + मैन्युअल', mr: 'सेन्सर + मॅन्युअल', en: 'Sensor + manual' }, language)
                : localize({ hi: 'मैन्युअल', mr: 'मॅन्युअल', en: 'Manual' }, language),
            },
          ].map((item) => (
            <div key={item.label} className="rounded-[24px] bg-[#f6faf4] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary">{item.label}</p>
              <p className="mt-2 text-sm font-black text-text-primary">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-[24px] border border-[#e7eee4] bg-[#fbfdfb] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-[#1a3d1a]">
            <MapPin size={15} />
            <span>{localize({ hi: 'खेत स्थान', mr: 'शेत ठिकाण', en: 'Farm location' }, language)}</span>
          </div>
          <p className="text-sm leading-6 text-text-secondary">
            {village}, {district}, {stateName}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-[28px] border border-border bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        <SectionTitle
          icon={<Globe size={18} />}
          title={localize({ hi: 'भाषा और यूनिट्स', mr: 'भाषा आणि युनिट्स', en: 'Language and units' }, language)}
        />

        <div>
          <p className="mb-2 text-sm font-bold text-text-secondary">
            {localize({ hi: 'ऐप भाषा', mr: 'अॅप भाषा', en: 'App language' }, language)}
          </p>
          <PreferencePillGroup options={LANGUAGE_OPTIONS} value={language} onChange={setLanguage} />
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-bold text-text-secondary">
            {localize({ hi: 'भूमि यूनिट', mr: 'जमीन युनिट', en: 'Land unit' }, language)}
          </p>
          <PreferencePillGroup options={UNIT_OPTIONS} value={units} onChange={setUnits} />
        </div>
      </div>

      <div className="mt-5 rounded-[28px] border border-border bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)] dark:border-dark-border dark:bg-dark-card">
        <SectionTitle
          icon={<Globe size={18} />}
          title={localize({ hi: 'दिखावट', mr: 'देखावा', en: 'Appearance' }, language)}
        />

        <div className="flex items-center justify-between rounded-2xl bg-[#f6faf4] p-4 dark:bg-slate-800">
          <div>
            <p className="text-sm font-black text-text-primary dark:text-white">
              {localize({ hi: 'डार्क मोड', mr: 'डार्क मोड', en: 'Dark Mode' }, language)}
            </p>
            <p className="mt-1 text-xs text-text-secondary dark:text-slate-400">
              {localize({ hi: 'बैटरी बचाएं', mr: 'बॅटरी वाचवा', en: 'Save battery' }, language)}
            </p>
          </div>
          <button
            type="button"
            onClick={useSettingsStore.getState().toggleDarkMode}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${useSettingsStore((state) => state.darkMode) ? 'bg-[#1a3d1a]' : 'bg-[#d6e5d5]'}`}
          >
            <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${useSettingsStore((state) => state.darkMode) ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-[28px] border border-border bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)] dark:border-dark-border dark:bg-dark-card">
        <SectionTitle
          icon={<BellRing size={18} />}
          title={localize({ hi: 'नोटिफिकेशन', mr: 'सूचना', en: 'Notifications' }, language)}
        />

        <div className="space-y-3">
          {Object.entries(notificationPrefs).map(([key, value]) => {
            const copy = NOTIFICATION_COPY[key];

            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleNotification(key)}
                className="flex w-full items-center justify-between rounded-[22px] border border-[#e7eee4] bg-[#f7faf5] px-4 py-4 text-left transition hover:bg-[#f2f8f0]"
              >
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-black text-text-primary">{localize(copy.label, language)}</p>
                  <p className="mt-1 text-sm text-text-secondary">{localize(copy.description, language)}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${value ? 'bg-[#1a3d1a] text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                >
                  {value
                    ? localize({ hi: 'चालू', mr: 'चालू', en: 'ON' }, language)
                    : localize({ hi: 'बंद', mr: 'बंद', en: 'OFF' }, language)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 rounded-[28px] border border-border bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        <SectionTitle
          icon={<Shield size={18} />}
          title={localize({ hi: 'ऐप और भरोसा', mr: 'अॅप आणि विश्वास', en: 'App and trust' }, language)}
        />

        <div className="space-y-3">
          {[
            {
              label: localize({ hi: 'किसान प्रोफ़ाइल और ID कार्ड', mr: 'शेतकरी प्रोफाइल आणि आयडी', en: 'Farmer Profile & ID Card' }, language),
              icon: <UserCircle2 size={16} className="text-emerald-700" />,
              onClick: () => navigate('/profile'),
            },
            {
              label: localize({ hi: 'नया सेंसर जोड़ें', mr: 'नवीन सेन्सर जोडा', en: 'Add new sensor' }, language),
              icon: <Cpu size={16} className="text-[#1a3d1a]" />,
              onClick: () => navigate('/hardware'),
            },
            {
              label: localize({ hi: 'ग्राहक सहायता', mr: 'ग्राहक समर्थन', en: 'Customer Support' }, language),
              icon: <MessageCircle size={16} className="text-[#1a3d1a]" />,
              onClick: () => navigate('/support'),
            },
            {
              label: localize({ hi: 'अपनी राय दें (फीडबैक)', mr: 'तुमचा अभिप्राय द्या', en: 'Give Feedback' }, language),
              icon: <Star size={16} className="text-[#1a3d1a]" />,
              onClick: () => navigate('/feedback'),
            },
            {
              label: localize({ hi: 'प्राइवेसी पॉलिसी', mr: 'प्रायव्हसी पॉलिसी', en: 'Privacy policy' }, language),
              icon: <Lock size={16} className="text-[#1a3d1a]" />,
              onClick: () => window.open('https://vercel.com/legal/privacy-policy', '_blank', 'noopener,noreferrer'),
            },
            {
              label: localize(
                {
                  hi: 'अकाउंट और डेटा हटाने की जानकारी',
                  mr: 'अकाउंट आणि डेटा हटवण्याची माहिती',
                  en: 'Account and data deletion info',
                },
                language
              ),
              icon: <Trash2 size={16} className="text-[#b91c1c]" />,
              onClick: () => shareWhatsApp('I need help with account deletion and data privacy details.'),
            },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className="flex w-full items-center justify-between rounded-[22px] border border-[#e7eee4] bg-[#f7faf5] px-4 py-4 text-left transition hover:bg-[#f2f8f0]"
            >
              <span className="text-sm font-black text-text-primary">{item.label}</span>
              <div className="flex items-center gap-3">
                {item.icon}
                <ArrowRight size={14} className="text-slate-400" />
              </div>
            </button>
          ))}
        </div>
      </div>


      <div className="mt-6 text-center">
        {showLogoutConfirm ? (
          <div className="rounded-[24px] border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-bold leading-6 text-red-700">
              {localize(
                {
                  hi: 'क्या आप वाकई लॉगआउट करना चाहते हैं? अगली बार OTP या PIN फिर चाहिए होगा।',
                  mr: 'तुम्हाला नक्की लॉगआउट करायचे आहे का? पुढच्या वेळी OTP किंवा PIN पुन्हा लागेल.',
                  en: 'Do you really want to log out? You will need OTP or PIN again next time.',
                },
                language
              )}
            </p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-2xl border border-red-200 px-4 py-3 text-sm font-bold text-red-700"
              >
                {localize({ hi: 'रद्द करें', mr: 'रद्द करा', en: 'Cancel' }, language)}
              </button>
              <button
                type="button"
                onClick={() => switchAccount()}
                className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white"
              >
                {localize({ hi: 'लॉगआउट / किसान बदलें', mr: 'लॉगआउट / शेतकरी बदला', en: 'Log Out / Switch Farmer' }, language)}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setShowLogoutConfirm(true)} className="text-sm font-black text-red-600">
            {localize({ hi: 'लॉगआउट / किसान बदलें', mr: 'लॉगआउट / शेतकरी बदला', en: 'Log Out / Switch Farmer' }, language)}
          </button>
        )}
      </div>
    </div>
  );
}
