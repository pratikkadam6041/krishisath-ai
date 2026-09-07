import { createTrendSeries } from '../utils/formatters.js';

export const APP_VERSION = '2.0.0';

export const LANGUAGE_OPTIONS = [
  {
    code: 'hi',
    native: 'हिंदी',
    tagline: 'खेती का स्मार्ट साथी',
    samples: ['मौसम', 'सिंचाई', 'मंडी भाव'],
  },
  {
    code: 'mr',
    native: 'मराठी',
    tagline: 'शेतीचा स्मार्ट साथी',
    samples: ['हवामान', 'पाणी', 'बाजारभाव'],
  },
  {
    code: 'en',
    native: 'English',
    tagline: 'Smart farming companion',
    samples: ['Weather', 'Watering', 'Market prices'],
  },
];

export const CROP_LIBRARY = [
  {
    id: 'wheat',
    emoji: '🌾',
    color: 'from-amber-100 via-amber-50 to-white',
    name: { hi: 'गेहूं', mr: 'गहू', en: 'Wheat' },
    subtitle: { hi: 'रबी की मुख्य फसल', mr: 'रब्बी हंगाम', en: 'Rabi staple crop' },
  },
  {
    id: 'rice',
    emoji: '🌾',
    color: 'from-lime-100 via-green-50 to-white',
    name: { hi: 'धान', mr: 'भात', en: 'Rice' },
    subtitle: { hi: 'पानी वाली फसल', mr: 'पाण्याची फसल', en: 'Water-loving crop' },
  },
  {
    id: 'sugarcane',
    emoji: '🎋',
    color: 'from-emerald-100 via-green-50 to-white',
    name: { hi: 'गन्ना', mr: 'ऊस', en: 'Sugarcane' },
    subtitle: { hi: 'लंबी अवधि', mr: 'दीर्घ कालावधी', en: 'Long duration crop' },
  },
  {
    id: 'cotton',
    emoji: '🌼',
    color: 'from-stone-100 via-white to-amber-50',
    name: { hi: 'कपास', mr: 'कापूस', en: 'Cotton' },
    subtitle: { hi: 'कीट सुरक्षा जरूरी', mr: 'कीड नियंत्रण महत्त्वाचे', en: 'Needs pest vigilance' },
  },
  {
    id: 'soybean',
    emoji: '🌿',
    color: 'from-green-100 via-lime-50 to-white',
    name: { hi: 'सोयाबीन', mr: 'सोयाबीन', en: 'Soybean' },
    subtitle: { hi: 'तेलहन फसल', mr: 'तेलबिया पीक', en: 'Oilseed crop' },
  },
  {
    id: 'onion',
    emoji: '🧅',
    color: 'from-fuchsia-100 via-rose-50 to-white',
    name: { hi: 'प्याज', mr: 'कांदा', en: 'Onion' },
    subtitle: { hi: 'भंडारण पर ध्यान', mr: 'साठवण महत्त्वाची', en: 'Storage-sensitive crop' },
  },
  {
    id: 'tomato',
    emoji: '🍅',
    color: 'from-red-100 via-rose-50 to-white',
    name: { hi: 'टमाटर', mr: 'टोमॅटो', en: 'Tomato' },
    subtitle: { hi: 'रोग स्कैन उपयोगी', mr: 'रोग स्कॅन उपयुक्त', en: 'Great for scan alerts' },
  },
  {
    id: 'maize',
    emoji: '🌽',
    color: 'from-yellow-100 via-amber-50 to-white',
    name: { hi: 'मक्का', mr: 'मका', en: 'Maize' },
    subtitle: { hi: 'जल संतुलन जरूरी', mr: 'पाणी संतुलन महत्त्वाचे', en: 'Needs balanced irrigation' },
  },
  {
    id: 'grapes',
    emoji: '🍇',
    color: 'from-violet-100 via-purple-50 to-white',
    name: { hi: 'अंगूर', mr: 'द्राक्षे', en: 'Grapes' },
    subtitle: { hi: 'बाग प्रबंधन', mr: 'बाग व्यवस्थापन', en: 'Orchard management crop' },
  },
  {
    id: 'pomegranate',
    emoji: '🍎',
    color: 'from-red-100 via-orange-50 to-white',
    name: { hi: 'अनार', mr: 'डाळिंब', en: 'Pomegranate' },
    subtitle: { hi: 'उच्च मूल्य फसल', mr: 'उच्च मूल्य पीक', en: 'High value orchard crop' },
  },
  {
    id: 'other',
    emoji: '🌱',
    color: 'from-slate-100 via-white to-green-50',
    name: { hi: 'अन्य', mr: 'इतर', en: 'Other' },
    subtitle: { hi: 'आपकी स्थानीय फसल', mr: 'तुमचे स्थानिक पीक', en: 'Your local crop' },
  },
];

export const PHOTO_TIPS = [
  {
    id: 'tip-1',
    emoji: '📸',
    title: { hi: 'एक पत्ता करीब से', mr: 'एक पान जवळून', en: 'Single leaf close-up' },
  },
  {
    id: 'tip-2',
    emoji: '☀️',
    title: { hi: 'अच्छी रोशनी', mr: 'चांगला प्रकाश', en: 'Good daylight' },
  },
  {
    id: 'tip-3',
    emoji: '🧼',
    title: { hi: 'धुंधली फोटो नहीं', mr: 'धूसर फोटो नको', en: 'Avoid blur' },
  },
  {
    id: 'tip-4',
    emoji: '🌿',
    title: { hi: 'रोग वाला हिस्सा दिखाएं', mr: 'रोगग्रस्त भाग दाखवा', en: 'Show infected area' },
  },
];

export const SCHEME_LIBRARY = [
  {
    id: 'pm-kisan',
    category: 'subsidy',
    icon: '💸',
    deadline: '30 June',
    eligible: true,
    state: 'All India',
    department: 'Ministry of Agriculture',
    name: {
      hi: 'PM Kisan सम्मान निधि',
      mr: 'PM किसान सन्मान निधी',
      en: 'PM Kisan Samman Nidhi',
    },
    summary: {
      hi: 'छोटे और मध्यम किसानों के लिए प्रतिवर्ष ₹6,000 सहायता।',
      mr: 'लघु आणि मध्यम शेतकऱ्यांसाठी वर्षाला ₹6,000 मदत.',
      en: 'Annual ₹6,000 support for eligible small and medium farmers.',
    },
    steps: [
      'Aadhaar linked bank account',
      'Land record copy',
      'Farmer registration on PM Kisan portal',
    ],
  },
  {
    id: 'crop-insurance',
    category: 'insurance',
    icon: '🛡️',
    deadline: '15 July',
    eligible: true,
    state: 'Maharashtra',
    department: 'Agriculture Insurance Company',
    name: {
      hi: 'प्रधानमंत्री फसल बीमा योजना',
      mr: 'प्रधानमंत्री पीक विमा योजना',
      en: 'Pradhan Mantri Fasal Bima Yojana',
    },
    summary: {
      hi: 'मौसम और प्राकृतिक आपदा से फसल नुकसान का बीमा।',
      mr: 'हवामान आणि नैसर्गिक आपत्तीमुळे होणाऱ्या नुकसानासाठी विमा.',
      en: 'Insurance cover for crop loss due to weather and disasters.',
    },
    steps: ['Sowing proof', 'Bank passbook', 'Crop details', 'Insurance enrollment receipt'],
  },
  {
    id: 'drip-irrigation',
    category: 'subsidy',
    icon: '💧',
    deadline: '12 August',
    eligible: false,
    state: 'Maharashtra',
    department: 'Micro Irrigation Mission',
    name: {
      hi: 'ड्रिप सिंचाई सब्सिडी',
      mr: 'ठिबक सिंचन अनुदान',
      en: 'Drip Irrigation Subsidy',
    },
    summary: {
      hi: 'जल बचत के लिए ड्रिप सिस्टम पर अनुदान।',
      mr: 'पाणी बचतीसाठी ठिबक प्रणालीवर अनुदान.',
      en: 'Subsidy support for drip irrigation systems.',
    },
    steps: ['Land map', 'Quotation from vendor', 'Bank details', 'Water source proof'],
  },
  {
    id: 'farmer-training',
    category: 'training',
    icon: '🎓',
    deadline: '',
    eligible: true,
    state: 'Maharashtra',
    department: 'Krishi Vigyan Kendra',
    name: {
      hi: 'फार्मर ट्रेनिंग प्रोग्राम',
      mr: 'शेतकरी प्रशिक्षण कार्यक्रम',
      en: 'Farmer Training Program',
    },
    summary: {
      hi: 'कीट नियंत्रण, मिट्टी स्वास्थ्य और बाजार तैयारी पर प्रशिक्षण।',
      mr: 'कीड नियंत्रण, माती आरोग्य आणि बाजार तयारीवरील प्रशिक्षण.',
      en: 'Training on pest control, soil health, and market readiness.',
    },
    steps: ['Select district center', 'Choose training date', 'Carry ID proof'],
  },
];

export const SOIL_RECOMMENDATIONS = [
  {
    key: 'nitrogen',
    label: { hi: 'नाइट्रोजन', mr: 'नायट्रोजन', en: 'Nitrogen' },
    verdictLow: {
      hi: 'नाइट्रोजन कम है — यूरिया 25 kg प्रति एकड़ डालें।',
      mr: 'नायट्रोजन कमी आहे — युरिया 25 kg प्रति एकर द्या.',
      en: 'Nitrogen is low. Apply 25 kg urea per acre.',
    },
  },
  {
    key: 'phosphorus',
    label: { hi: 'फास्फोरस', mr: 'फॉस्फरस', en: 'Phosphorus' },
    verdictLow: {
      hi: 'फास्फोरस कम है — DAP की मात्रा बढ़ाएं।',
      mr: 'फॉस्फरस कमी आहे — DAP वाढवा.',
      en: 'Phosphorus is low. Increase DAP application.',
    },
  },
  {
    key: 'potassium',
    label: { hi: 'पोटाश', mr: 'पोटॅश', en: 'Potassium' },
    verdictLow: {
      hi: 'पोटाश कम है — MOP 15 kg प्रति एकड़ दें।',
      mr: 'पोटॅश कमी आहे — MOP 15 kg प्रति एकर द्या.',
      en: 'Potassium is low. Apply 15 kg MOP per acre.',
    },
  },
];

export const CHAT_HISTORY_TEMPLATES = [
  {
    id: 'conv-1',
    title: 'White fly control',
    preview: 'How can I protect cotton from white fly after light rain?',
  },
  {
    id: 'conv-2',
    title: 'Pune mandi update',
    preview: 'Compare tomato prices between Pune and Nashik this week.',
  },
];

export const NOTIFICATION_TYPE_META = {
  moisture: { icon: '💧', tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  scheme: { icon: '🏛️', tone: 'bg-blue-50 text-blue-700 border-blue-100' },
  pest: { icon: '🐛', tone: 'bg-orange-50 text-orange-700 border-orange-100' },
  mandi: { icon: '📈', tone: 'bg-violet-50 text-violet-700 border-violet-100' },
  sensor: { icon: '📡', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export function getCropMeta(cropId) {
  return CROP_LIBRARY.find((crop) => crop.id === cropId) || CROP_LIBRARY[0];
}

export function buildZoneCharts(zone) {
  const moistureBase = zone.moisture ?? 55;
  const tempBase = zone.temperature ?? 29;
  const waterBase = zone.waterUsageToday ? Math.round(zone.waterUsageToday / 2) : 70;

  return {
    moisture: createTrendSeries(moistureBase, 8, 7, 10, 95),
    temperature: createTrendSeries(tempBase, 2.5, 7, 18, 42),
    waterUsage: createTrendSeries(waterBase, 22, 7, 20, 260),
    pumpStates: Array.from({ length: 7 }, (_, index) => (zone.pumpOn ? index > 3 : index === 1 || index === 4)),
  };
}
