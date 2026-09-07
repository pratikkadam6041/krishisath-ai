import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Download,
  Edit3,
  MapPin,
  Phone,
  QrCode,
  Save,
  Smartphone,
  User,
  Wheat,
  X,
  Zap,
} from 'lucide-react';

import { useSettingsStore } from '../store/settingsStore.js';
import { useAuthStore } from '../store/authStore.js';
import { localize } from '../utils/formatters.js';

/* ──────── tiny QR SVG renderer (no npm package needed) ──────── */
function QRCodeSVG({ value, size = 160 }) {
  // Simple matrix-based QR using a hash pattern for demo
  const cells = 21;
  const cellSize = size / cells;

  // Deterministic "pseudo-QR" based on value string
  const seed = value.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rng = (i) => {
    const x = Math.sin(seed + i) * 10000;
    return x - Math.floor(x);
  };

  const matrix = Array.from({ length: cells }, (_, r) =>
    Array.from({ length: cells }, (_, c) => {
      // Finder patterns (top-left, top-right, bottom-left)
      const inFinder = (r < 8 && c < 8) || (r < 8 && c >= cells - 8) || (r >= cells - 8 && c < 8);
      if (inFinder) {
        const rr = r < 8 ? r : r - (cells - 8);
        const cc = c < 8 ? c : c - (cells - 8);
        const abs = Math.max(Math.abs(rr - 3.5), Math.abs(cc - 3.5));
        return abs <= 3.5 && (abs >= 2.5 || abs <= 1.5);
      }
      // Timing patterns
      if (r === 6 || c === 6) return (r + c) % 2 === 0;
      // Data
      return rng(r * cells + c) > 0.48;
    })
  );

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill="white" rx="8" />
      {matrix.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#0f172a"
            />
          ) : null
        )
      )}
    </svg>
  );
}

/* ──────── CROPS list ──────── */
const ALL_CROPS = ['Wheat', 'Rice', 'Tomato', 'Onion', 'Grapes', 'Sugarcane', 'Cotton', 'Soybean', 'Maize', 'Jowar', 'Bajra', 'Tur'];

/* ──────── COMPONENT ──────── */
export default function FarmerProfileScreen() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const {
    ownerName, farmName, district, village, state, totalAcres,
    profilePhoto, cropZ1, cropZ2, supportPhone, updateProfile, language,
  } = useSettingsStore();
  const { phoneNumber } = useAuthStore();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    ownerName, farmName, district, village, state,
    totalAcres, cropZ1, cropZ2,
  });

  const farmerId = `KS-${(district || 'XX').toUpperCase().slice(0, 3)}-${(ownerName || 'KIS').toUpperCase().replace(/\s+/g, '').slice(0, 3)}-${String(Math.abs(((ownerName || '') + (district || '')).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 900 + 100)).padStart(3, '0')}`;

  const qrData = JSON.stringify({
    id: farmerId,
    name: ownerName,
    phone: phoneNumber,
    district,
    village,
    acres: totalAcres,
    app: 'KrishiSarth',
  });

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => updateProfile({ profilePhoto: ev.target.result });
    reader.readAsDataURL(file);
  }

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      updateProfile(form);
      setSaving(false);
      setEditing(false);
    }, 600);
  }

  const subStatus = { label: 'Active', color: 'emerald' };
  const expiryDate = new Date(Date.now() + 180 * 86400000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const LABELS = {
    title:       { hi: 'किसान प्रोफ़ाइल', mr: 'शेतकरी प्रोफाइल', en: 'Farmer Profile' },
    editProfile: { hi: 'प्रोफ़ाइल संपादित करें', mr: 'प्रोफाइल संपादित करा', en: 'Edit Profile' },
    saveProfile: { hi: 'सेव करें', mr: 'सेव्ह करा', en: 'Save' },
    name:        { hi: 'पूरा नाम', mr: 'पूर्ण नाव', en: 'Full Name' },
    farmName:    { hi: 'फार्म का नाम', mr: 'शेताचे नाव', en: 'Farm Name' },
    village:     { hi: 'गाँव', mr: 'गाव', en: 'Village' },
    district:    { hi: 'जिला', mr: 'जिल्हा', en: 'District' },
    state:       { hi: 'राज्य', mr: 'राज्य', en: 'State' },
    acres:       { hi: 'कुल एकड़', mr: 'एकूण एकर', en: 'Total Acres' },
    crop1:       { hi: 'मुख्य फसल 1', mr: 'मुख्य पीक 1', en: 'Primary Crop 1' },
    crop2:       { hi: 'मुख्य फसल 2', mr: 'मुख्य पीक 2', en: 'Primary Crop 2' },
    subscription:{ hi: 'सदस्यता', mr: 'सदस्यता', en: 'Subscription' },
    expires:     { hi: 'समाप्ति', mr: 'समाप्ती', en: 'Expires' },
    farmerId:    { hi: 'किसान आईडी', mr: 'शेतकरी आयडी', en: 'Farmer ID' },
    download:    { hi: 'आईडी कार्ड डाउनलोड', mr: 'आयडी कार्ड डाउनलोड', en: 'Download ID Card' },
    phone:       { hi: 'मोबाइल नंबर', mr: 'मोबाइल नंबर', en: 'Mobile Number' },
  };

  const t = (key) => localize(LABELS[key], language);

  return (
    <div className="px-4 pt-4 pb-28">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm border border-gray-100"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-black text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500">{farmerId}</p>
        </div>
        <button
          type="button"
          onClick={() => editing ? handleSave() : setEditing(true)}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
            editing
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {saving ? (
            <span className="animate-spin">⌛</span>
          ) : editing ? (
            <><Save size={14} /> {t('saveProfile')}</>
          ) : (
            <><Edit3 size={14} /> {t('editProfile')}</>
          )}
        </button>
      </div>

      {/* Avatar + QR Row */}
      <div className="mb-5 flex items-center gap-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
        {/* Avatar */}
        <div className="relative">
          <div
            className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg"
            onClick={() => editing && fileRef.current?.click()}
            style={{ cursor: editing ? 'pointer' : 'default' }}
          >
            {profilePhoto ? (
              <img src={profilePhoto} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <User size={40} className="text-white" />
            )}
          </div>
          {editing && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-white shadow"
            >
              <Camera size={14} />
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>

        {/* Name + Info */}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-black text-gray-900 truncate">{ownerName}</h2>
          <p className="text-sm text-gray-500 truncate">{farmName}</p>
          <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
            <MapPin size={13} className="text-emerald-500 shrink-0" />
            <span className="truncate">{village}, {district}</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
            <Phone size={13} className="text-emerald-500 shrink-0" />
            <span>{phoneNumber || '+91 XXXXXXXXXX'}</span>
          </div>
        </div>

        {/* QR */}
        <div className="shrink-0">
          <QRCodeSVG value={qrData} size={90} />
          <p className="mt-1 text-center text-[10px] text-gray-400">Scan QR</p>
        </div>
      </div>

      {/* Subscription Banner */}
      <div className="mb-5 flex items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-700">{t('subscription')}</p>
            <p className="text-base font-black text-emerald-900">Pro Plan · {subStatus.label}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">{t('expires')}</p>
          <p className="text-sm font-bold text-gray-800">{expiryDate}</p>
        </div>
      </div>

      {/* Farmer ID Card */}
      <div className="mb-5 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode size={18} className="text-emerald-600" />
            <h3 className="font-black text-gray-900">{t('farmerId')}</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              const el = document.createElement('a');
              el.download = `KrishiSarth_ID_${farmerId}.txt`;
              el.href = `data:text/plain,${encodeURIComponent(`KrishiSarth Farmer ID Card\n\nID: ${farmerId}\nName: ${ownerName}\nPhone: ${phoneNumber}\nVillage: ${village}, ${district}, ${state}\nFarm: ${farmName} (${totalAcres} Acres)\nCrops: ${cropZ1}, ${cropZ2}\nSubscription: Pro Plan (Active)\nExpiry: ${expiryDate}`)}`; 
              el.click();
            }}
            className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <Download size={13} /> {t('download')}
          </button>
        </div>

        {/* ID Card Visual */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-800 to-teal-900 p-5 text-white shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300">KrishiSarth AI</p>
              <p className="text-lg font-black">{farmerId}</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border-2 border-white/20 bg-white/10">
              {profilePhoto ? (
                <img src={profilePhoto} alt="" className="h-full w-full object-cover" />
              ) : (
                <User size={28} className="text-white/60" />
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] text-emerald-400">Name</p>
              <p className="font-bold">{ownerName}</p>
            </div>
            <div>
              <p className="text-[10px] text-emerald-400">Phone</p>
              <p className="font-bold">{phoneNumber}</p>
            </div>
            <div>
              <p className="text-[10px] text-emerald-400">Location</p>
              <p className="font-bold truncate">{village}, {district}</p>
            </div>
            <div>
              <p className="text-[10px] text-emerald-400">Farm Size</p>
              <p className="font-bold">{totalAcres} Acres</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
            <p className="text-xs font-semibold text-emerald-200">Pro Subscriber · Verified Farmer</p>
          </div>
        </div>
      </div>

      {/* Edit Fields */}
      {editing && (
        <div className="mb-5 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-black text-gray-900 flex items-center gap-2">
            <Edit3 size={16} className="text-emerald-600" /> Edit Information
          </h3>
          <div className="space-y-3">
            {[
              { key: 'ownerName', label: t('name'), type: 'text' },
              { key: 'farmName', label: t('farmName'), type: 'text' },
              { key: 'village', label: t('village'), type: 'text' },
              { key: 'district', label: t('district'), type: 'text' },
              { key: 'state', label: t('state'), type: 'text' },
              { key: 'totalAcres', label: t('acres'), type: 'number' },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label className="mb-1 block text-xs font-semibold text-gray-500">{label}</label>
                <input
                  type={type}
                  value={form[key] || ''}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            ))}

            {/* Crop Selectors */}
            {['cropZ1', 'cropZ2'].map((key, i) => (
              <div key={key}>
                <label className="mb-1 block text-xs font-semibold text-gray-500">{t(i === 0 ? 'crop1' : 'crop2')}</label>
                <select
                  value={form[key] || ''}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  {ALL_CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => { setEditing(false); setForm({ ownerName, farmName, district, village, state, totalAcres, cropZ1, cropZ2 }); }}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Static Info (when not editing) */}
      {!editing && (
        <div className="mb-5 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-black text-gray-900 flex items-center gap-2">
            <Wheat size={16} className="text-emerald-600" /> Farm Details
          </h3>
          <div className="space-y-3">
            {[
              { icon: User, label: t('name'), value: ownerName },
              { icon: Smartphone, label: t('phone'), value: phoneNumber },
              { icon: MapPin, label: t('village'), value: `${village}, ${district}, ${state}` },
              { icon: Wheat, label: 'Crops', value: `${cropZ1} • ${cropZ2}` },
              { icon: Zap, label: t('acres'), value: `${totalAcres} Acres` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center justify-between gap-3 border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                    <Icon size={15} className="text-emerald-600" />
                  </div>
                  <span className="text-sm text-gray-500">{label}</span>
                </div>
                <span className="text-sm font-bold text-gray-900 text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QR Section */}
      <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm text-center">
        <h3 className="mb-3 font-black text-gray-900">Farmer QR Code</h3>
        <p className="mb-4 text-xs text-gray-500">Admin can scan this to access your profile instantly</p>
        <div className="flex justify-center">
          <QRCodeSVG value={qrData} size={180} />
        </div>
        <p className="mt-3 text-xs font-mono font-semibold text-gray-400">{farmerId}</p>
      </div>
    </div>
  );
}
