import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Cpu, MapPin, Search, Tractor, Wheat } from 'lucide-react';
import BrandLogo from '../components/BrandLogo.jsx';
import CropAvatar from '../components/CropAvatar.jsx';
import { CROP_LIBRARY } from '../data/appContent.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { useZoneStore } from '../store/zoneStore.js';
import { useAuthStore } from '../store/authStore.js';
import { useMandiStore } from '../store/mandiStore.js';
import { useFarmerStore } from '../store/farmerStore.js';
import { getUserLocation, reverseGeocode } from '../api/liveServices.js';
import { formatArea, localize } from '../utils/formatters.js';

const COPY = {
  hi: {
    title: 'आपकी शुरुआत',
    skip: 'अभी छोड़ें',
    step1: 'आपका खेत',
    step2: 'आपकी मुख्य फसलें',
    step3: 'हार्डवेयर चुनें',
    farmName: 'खेत का नाम',
    farmHint: 'गांव या खेत का नाम',
    acres: 'कुल जमीन',
    location: 'Detected',
    correct: 'सही है?',
    yes: 'हाँ',
    edit: 'बदलें',
    sensor: 'मेरे पास सेंसर है',
    sensorSub: 'अभी सेटअप करें और लाइव डेटा देखें',
    manual: 'सेंसर नहीं है, मैन्युअल एंट्री करूंगा',
    manualSub: 'ऐप आपके खेत का रिकॉर्ड मैन्युअली भी संभालेगा',
    finish: 'हो गया',
    celebration: 'आपका खेत तैयार है',
  },
  mr: {
    title: 'तुमची सुरुवात',
    skip: 'आत्ता वगळा',
    step1: 'तुमचे शेत',
    step2: 'तुमची मुख्य पिके',
    step3: 'हार्डवेअर निवडा',
    farmName: 'शेताचे नाव',
    farmHint: 'गाव किंवा शेताचे नाव',
    acres: 'एकूण जमीन',
    location: 'Detected',
    correct: 'हे बरोबर आहे का?',
    yes: 'होय',
    edit: 'बदला',
    sensor: 'माझ्याकडे सेन्सर आहे',
    sensorSub: 'आत्ताच सेटअप करा आणि लाईव्ह डेटा पाहा',
    manual: 'सेन्सर नाही, मी मॅन्युअल नोंद करेन',
    manualSub: 'अॅप तुमच्या शेताची माहिती मॅन्युअलीही सांभाळेल',
    finish: 'पूर्ण झाले',
    celebration: 'तुमचे शेत तयार आहे',
  },
  en: {
    title: 'Set up your farm',
    skip: 'Skip for now',
    step1: 'Your farm',
    step2: 'Your crops',
    step3: 'Choose hardware path',
    farmName: 'Farm name',
    farmHint: 'Village or field name',
    acres: 'Total land',
    location: 'Detected',
    correct: 'Is this correct?',
    yes: 'Yes',
    edit: 'Edit',
    sensor: 'I have a sensor',
    sensorSub: 'Set it up now and unlock live field data',
    manual: 'No sensor, I will enter data manually',
    manualSub: 'The app will adapt for manual farming records too',
    finish: 'Finish setup',
    celebration: 'Your farm is ready',
  },
};

function StepProgress({ step }) {
  return (
    <div className="mb-8 flex gap-2">
      {[1, 2, 3].map((item) => (
        <div key={item} className={`h-2 flex-1 rounded-full ${item <= step ? 'bg-[#1a3d1a]' : 'bg-slate-200'}`} />
      ))}
    </div>
  );
}

export default function OnboardingScreen() {
  const navigate = useNavigate();
  const language = useSettingsStore((state) => state.language);
  const updateProfile = useSettingsStore((state) => state.updateProfile);
  const setUserProfile = useZoneStore((state) => state.setUserProfile);
  const configureZonesForMode = useZoneStore((state) => state.configureZonesForMode);
  const setMandiCrops = useMandiStore((state) => state.setSelectedCrops);
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding);
  const skipOnboarding = useAuthStore((state) => state.skipOnboarding);
  const phoneNumber = useAuthStore((state) => state.phoneNumber);
  const firstName = useAuthStore((state) => state.firstName);
  const addOrUpdateFarmer = useFarmerStore((state) => state.addOrUpdateFarmer);

  const copy = COPY[language] || COPY.hi;
  const [step, setStep] = useState(1);
  const [farmName, setFarmName] = useState('');
  const [totalAcres, setTotalAcres] = useState(4.5);
  const [selectedCrops, setSelectedCropIds] = useState(['wheat', 'tomato']);
  const [hardwarePath, setHardwarePath] = useState('sensor');
  const [cropSearch, setCropSearch] = useState('');
  const [location, setLocation] = useState({ village: 'Pimpri', district: 'Pune', state: 'Maharashtra' });
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function detectLocation() {
      setIsLoadingLocation(true);
      const coords = await getUserLocation();
      const geo = await reverseGeocode(coords.lat, coords.lon);
      if (!isMounted) return;

      setLocation({
        village: geo.village || 'Pimpri',
        district: geo.district || 'Pune',
        state: geo.state || 'Maharashtra',
      });
      setIsLoadingLocation(false);
    }

    detectLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  const fieldBlocks = useMemo(() => {
    const blocks = Math.min(10, Math.max(2, Math.round(totalAcres / 5)));
    return Array.from({ length: blocks });
  }, [totalAcres]);

  const filteredCrops = useMemo(
    () =>
      CROP_LIBRARY.filter((crop) => {
        const haystack = `${localize(crop.name, language)} ${localize(crop.subtitle, language)}`.toLowerCase();
        return haystack.includes(cropSearch.trim().toLowerCase());
      }),
    [cropSearch, language]
  );

  const finishSetup = (skip = false) => {
    if (skip) {
      skipOnboarding();
      navigate('/');
      return;
    }

    updateProfile({
      farmName: farmName || 'KrishiSarth Farm',
      district: location.district,
      village: location.village,
      state: location.state,
      totalAcres,
      cropZ1: selectedCrops[0] || 'Wheat',
      cropZ2: selectedCrops[1] || selectedCrops[0] || 'Tomato',
    });

    setUserProfile({
      userName: '',
      farmName: farmName || 'KrishiSarth Farm',
      village: location.village,
      district: location.district,
      state: location.state,
      totalAcres,
      crops: selectedCrops,
      isManualMode: hardwarePath === 'manual',
    });

    configureZonesForMode({
      isManualMode: hardwarePath === 'manual',
      crops: selectedCrops,
    });

    setMandiCrops(selectedCrops);

    // Auto-register this farmer in the Admin Farmer Directory
    // Use phone number as the stable key so same farmer always maps to the same ID
    addOrUpdateFarmer({
      phone: phoneNumber || '',
      name: firstName || farmName || 'Farmer',
      district: location.district,
      village: location.village,
      crops: selectedCrops,
      acres: totalAcres,
      plan: 'Basic',
    });

    setShowCelebration(true);
    window.setTimeout(() => {
      completeOnboarding();
      navigate(hardwarePath === 'sensor' ? '/hardware' : '/');
    }, 1200);
  };

  const toggleCrop = (cropId) => {
    setSelectedCropIds((current) =>
      current.includes(cropId) ? current.filter((item) => item !== cropId) : [...current, cropId]
    );
  };

  if (showCelebration) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#f4f9f2] px-6 text-center">
        <div className="mb-6 flex items-end justify-center gap-2">
          {[36, 58, 74, 50, 34].map((height, index) => (
            <div
              key={height}
              className="w-4 rounded-full bg-gradient-to-t from-[#1a3d1a] to-lime-300"
              style={{ height, animation: `growUp 0.9s ease ${index * 0.07}s both` }}
            />
          ))}
        </div>
        <h1 className="text-3xl font-black text-[#1a3d1a]">{copy.celebration}</h1>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#f4f9f2] px-6 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size={52} rounded="rounded-[18px]" shadow={false} imageClassName="ring-1 ring-[#dfe8db]" />
            <div>
              <h1 className="text-2xl font-black text-text-primary">{copy.title}</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => finishSetup(true)}
            className="rounded-full border border-border bg-white px-4 py-2 text-sm font-bold text-text-secondary"
          >
            {copy.skip}
          </button>
        </div>

        <StepProgress step={step} />

        {step === 1 ? (
          <div className="space-y-6">
            <div className="rounded-[28px] border border-border bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.07)]">
              <h2 className="text-2xl font-black text-text-primary">{copy.step1}</h2>
              <div className="mt-5">
                <label className="mb-2 block text-sm font-bold text-text-secondary">{copy.farmName}</label>
                <input
                  value={farmName}
                  onChange={(event) => setFarmName(event.target.value)}
                  placeholder={copy.farmHint}
                  className="h-14 w-full rounded-2xl border border-border bg-[#f7faf5] px-4 text-base font-semibold text-text-primary outline-none"
                />
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-bold text-text-secondary">{copy.acres}</label>
                  <span className="text-sm font-black text-[#1a3d1a]">{formatArea(totalAcres, 'acre', language)}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="50"
                  step="0.5"
                  value={totalAcres}
                  onChange={(event) => setTotalAcres(Number(event.target.value))}
                  className="w-full accent-[#1a3d1a]"
                />
                <div className="mt-4 flex items-end gap-2 rounded-2xl bg-[#f3f7f1] p-4">
                  {fieldBlocks.map((_, index) => (
                    <div
                      key={`field-${index}`}
                      className="flex-1 rounded-t-2xl bg-gradient-to-t from-[#1a3d1a] to-lime-400"
                      style={{ height: `${40 + index * 8}px` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-border bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.07)]">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eff7ef] text-[#1a3d1a]">
                  <MapPin size={22} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-text-secondary">{copy.location}</p>
                  
                  {isEditingLocation ? (
                    <div className="mt-2 space-y-2">
                      <input 
                        value={location.village} 
                        onChange={e => setLocation({...location, village: e.target.value})}
                        placeholder="Village" 
                        className="w-full rounded-xl border px-3 py-2 text-sm outline-none" 
                      />
                      <input 
                        value={location.district} 
                        onChange={e => setLocation({...location, district: e.target.value})}
                        placeholder="District" 
                        className="w-full rounded-xl border px-3 py-2 text-sm outline-none" 
                      />
                      <button 
                        onClick={() => setIsEditingLocation(false)} 
                        className="mt-2 rounded-full bg-[#1a3d1a] px-4 py-2 text-sm font-bold text-white w-full"
                      >
                        {localize({ hi: 'सेव करें', mr: 'जतन करा', en: 'Save' }, language)}
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-base font-black text-text-primary">
                        {isLoadingLocation ? 'Detecting location...' : `${location.village}, ${location.district}, ${location.state}`}
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        <button 
                          type="button" 
                          onClick={() => setLocationConfirmed(true)}
                          className={`rounded-full px-4 py-2 text-sm font-bold transition ${locationConfirmed ? 'bg-green-100 text-green-800' : 'bg-[#1a3d1a] text-white'}`}
                        >
                          {locationConfirmed ? localize({ hi: 'पुष्टीकृत', mr: 'निश्चित', en: 'Confirmed' }, language) : copy.yes}
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setIsEditingLocation(true)}
                          className="rounded-full border border-border px-4 py-2 text-sm font-bold text-text-secondary"
                        >
                          {copy.edit}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#1a3d1a] text-base font-black text-white"
            >
              {localize({ hi: 'अगला', mr: 'पुढे', en: 'Next' }, language)}
              <ChevronRight size={18} />
            </button>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <h2 className="mb-4 text-2xl font-black text-text-primary">{copy.step2}</h2>
            <div className="mb-4 rounded-[22px] border border-border bg-white px-4 py-3 shadow-[0_12px_24px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-3">
                <Search size={18} className="text-text-secondary" />
                <input
                  value={cropSearch}
                  onChange={(event) => setCropSearch(event.target.value)}
                  placeholder={localize({ hi: 'फसल खोजें', mr: 'पीक शोधा', en: 'Search crops' }, language)}
                  className="w-full bg-transparent text-sm font-semibold text-text-primary outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {filteredCrops.map((crop) => {
                const active = selectedCrops.includes(crop.id);
                return (
                  <button
                    key={crop.id}
                    type="button"
                    onClick={() => toggleCrop(crop.id)}
                    className={`relative overflow-hidden rounded-[24px] border p-4 text-left transition ${
                      active ? 'border-[#1a3d1a] bg-white shadow-lg' : 'border-border bg-white/80'
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${crop.color} opacity-90`} />
                    <div className="relative z-10">
                      <div className="mb-3 flex items-center justify-between">
                        <CropAvatar cropId={crop.id} size="md" />
                        {active ? (
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a3d1a] text-white">
                            <Check size={14} />
                          </span>
                        ) : null}
                      </div>
                      <h3 className="text-lg font-black text-text-primary">{localize(crop.name, language)}</h3>
                      <p className="mt-1 text-sm text-text-secondary">{localize(crop.subtitle, language)}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 rounded-2xl border border-border bg-white px-4 py-4 text-sm font-bold text-text-primary"
              >
                {localize({ hi: 'वापस', mr: 'मागे', en: 'Back' }, language)}
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-[1.4] rounded-2xl bg-[#1a3d1a] px-4 py-4 text-sm font-black text-white"
              >
                {localize({ hi: 'अगला', mr: 'पुढे', en: 'Next' }, language)}
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-text-primary">{copy.step3}</h2>
            <button
              type="button"
              onClick={() => setHardwarePath('sensor')}
              className={`w-full rounded-[28px] border p-5 text-left transition ${
                hardwarePath === 'sensor'
                  ? 'border-[#1a3d1a] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.1)]'
                  : 'border-border bg-white/80'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#eef7ef] text-[#1a3d1a]">
                  <Cpu size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-primary">{copy.sensor}</h3>
                  <p className="mt-1 text-sm text-text-secondary">{copy.sensorSub}</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setHardwarePath('manual')}
              className={`w-full rounded-[28px] border p-5 text-left transition ${
                hardwarePath === 'manual'
                  ? 'border-[#1a3d1a] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.1)]'
                  : 'border-border bg-white/80'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#fff7e7] text-[#a16207]">
                  <Tractor size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-primary">{copy.manual}</h3>
                  <p className="mt-1 text-sm text-text-secondary">{copy.manualSub}</p>
                </div>
              </div>
            </button>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 rounded-2xl border border-border bg-white px-4 py-4 text-sm font-bold text-text-primary"
              >
                {localize({ hi: 'वापस', mr: 'मागे', en: 'Back' }, language)}
              </button>
              <button
                type="button"
                onClick={() => finishSetup(false)}
                className="flex-[1.4] rounded-2xl bg-[#1a3d1a] px-4 py-4 text-sm font-black text-white"
              >
                {copy.finish}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
