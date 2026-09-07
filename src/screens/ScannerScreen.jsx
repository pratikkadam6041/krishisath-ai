import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  ScanSearch,
  Share2,
  Sparkles,
  Store,
  SunMedium,
  UploadCloud,
  ThumbsUp,
  ThumbsDown,
  Brain,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useSettingsStore } from '../store/settingsStore.js';
import { useZoneStore } from '../store/zoneStore.js';
import { useAuthStore } from '../store/authStore.js';
import { localize, formatRelativeTime } from '../utils/formatters.js';
import { shareScanResult, shareWhatsApp } from '../utils/shareWhatsApp.js';
import { enrichPestResult } from '../ai-ml/plantDiseaseKB.js';
import { classifySoilReportDecision, queueSoilReportReview, readSoilReportReviewQueue } from '../utils/soilReportGuard.js';

const REPORT_STORAGE_KEY = 'ks-scan-reports';
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

function readReports() {
  try {
    return JSON.parse(window.localStorage.getItem(REPORT_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeReports(reports) {
  window.localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(reports.slice(0, 10)));
}

function estimateSeverity(confidence) {
  if (confidence >= 85) return 'High';
  if (confidence >= 65) return 'Medium';
  return 'Low';
}

function numberOrNull(value) {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// In-memory / localStorage cache for Gemini results to avoid rate limits
async function sha256(base64) {
  try {
    const msgBuffer = new TextEncoder().encode(base64.slice(0, 1000)); 
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return base64.slice(0, 50);
  }
}

async function callGeminiVision(base64, mimeType, prompt, retries = 3) {
  const model = import.meta.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash-latest';
  
  // 1. Check cache
  const cacheKey = `ks-gemini-cache-${await sha256(base64)}-${prompt.length}`;
  try {
    const cached = window.localStorage.getItem(cacheKey);
    if (cached) return cached;
  } catch {
    // Cache access can fail in private mode; scanner still works without it.
  }

  // 2. Fetch with exponential backoff
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType || 'image/jpeg', data: base64 } },
              ],
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        if (response.status === 429) {
          throw new Error('Rate limit exceeded (429)');
        }
        throw new Error(`Gemini error ${response.status}: ${errText.slice(0, 200)}`);
      }

      const json = await response.json();
      const raw = json.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      
      const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/) ||
                        raw.match(/```([\s\S]*?)```/) ||
                        raw.match(/(\{[\s\S]*\})/);
      
      const result = jsonMatch ? jsonMatch[1].trim() : raw.trim();
      
      try {
        window.localStorage.setItem(cacheKey, result);
      } catch {
        // Ignore cache write failures.
      }
      
      return result;

    } catch (error) {
      console.warn(`[Gemini] Attempt ${attempt} failed:`, error.message);
      if (attempt === retries) throw error;
      // Exponential backoff: 1s, 2s, 4s...
      await new Promise(r => setTimeout(r, Math.pow(2, attempt - 1) * 1000));
    }
  }
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function analyzePestImage(file) {
  if (!GEMINI_KEY) {
    return {
      disease: 'Powdery Mildew (Demo — Add Gemini API Key)',
      confidence: 82,
      severity: 'Medium',
      treatment: 'Spray neem oil 5 ml/litre and improve airflow around the crop canopy.',
      dosage: '5 ml per litre water',
      method: 'Evening foliar spray',
      cost: '₹320 per acre',
      pest: 'Sphaerotheca fuliginea',
      affectedPart: 'Leaves, stems',
      preventionTip: 'Ensure proper plant spacing and avoid excessive nitrogen fertilization.',
    };
  }

  const base64 = await fileToBase64(file);
  const prompt = `You are an expert agricultural plant pathologist AI. Analyze this crop/plant image carefully.

Look for: disease symptoms, pest damage, discoloration, spots, lesions, wilting, or any abnormality.

Return ONLY a valid JSON object (no markdown, no extra text) with EXACTLY these fields:
{
  "disease": "specific disease or pest name",
  "confidence": <integer 0-100>,
  "severity": "Low" or "Medium" or "High" or "Critical",
  "treatment": "specific treatment steps in 2-3 sentences",
  "dosage": "chemical name and dose per litre or acre",
  "method": "application method",
  "cost": "estimated cost in Indian Rupees per acre",
  "pest": "scientific name if applicable, else empty string",
  "affectedPart": "which plant part is affected",
  "preventionTip": "how to prevent this in future"
}

If the crop appears healthy, set disease to "Healthy Crop" and confidence to 95.`;

  const rawJson = await callGeminiVision(base64, file.type, prompt);
  const parsed = JSON.parse(rawJson);

  return {
    disease: parsed.disease || 'Unknown Issue',
    confidence: Number(parsed.confidence) || 70,
    severity: parsed.severity || estimateSeverity(Number(parsed.confidence) || 70),
    treatment: parsed.treatment || 'Consult a local agricultural extension officer.',
    dosage: parsed.dosage || 'As per label instructions',
    method: parsed.method || 'Foliar spray',
    cost: parsed.cost || '₹200–500 per acre',
    pest: parsed.pest || '',
    affectedPart: parsed.affectedPart || 'Leaves',
    preventionTip: parsed.preventionTip || '',
  };
}


async function analyzeSoilImage(file) {
  // Offline fallback
  if (!GEMINI_KEY) {
    return {
      farmerName: null,
      zoneId: null,
      nitrogen: 42,
      phosphorus: 18,
      potassium: 28,
      ph: 6.7,
      organicCarbon: 0.58,
      recommendation: 'Apply 40 kg/acre Urea and 25 kg/acre DAP before next irrigation.',
      fertility: 'Medium',
      suitableCrops: ['wheat', 'onion', 'tomato'],
    };
  }

  // Step 1: OCR the soil report image (Tesseract.js)
  let extractedText = '';
  try {
    const Tesseract = await import('tesseract.js');
    const { data } = await Tesseract.default.recognize(file, 'eng', {
      logger: () => {}, // suppress logs
    });
    extractedText = data?.text?.trim() || '';
  } catch (ocrErr) {
    console.warn('[Scanner] OCR failed, using image-only:', ocrErr.message);
  }

  // Step 2: Send BOTH the OCR text AND the image to Gemini for best accuracy
  const base64 = await fileToBase64(file);
  const prompt = `You are an expert soil scientist AI. Analyze this soil test report image.

${extractedText ? `OCR text extracted from the report:\n${extractedText}\n\n` : ''}Your task: Extract all soil nutrient values from this report.

Return ONLY a valid JSON object (no markdown) with these exact fields:
{
  "farmerName": "name printed on report" or null,
  "zoneId": "zone id printed on report" or null,
  "nitrogen": number from soil test table only, or null if not present,
  "phosphorus": number from soil test table only, or null if not present,
  "potassium": number from soil test table only, or null if not present,
  "ph": number (0-14),
  "organicCarbon": number (percentage),
  "electricalConductivity": number (dS/m) or null,
  "zinc": number or null,
  "boron": number or null,
  "fertility": "Low" | "Medium" | "High",
  "ratings": { "nitrogen": "Low|Medium|High|Very High|Unknown", "phosphorus": "...", "potassium": "...", "ph": "..." },
  "requirements": { "nitrogen": number or null, "phosphorus": number or null, "potassium": number or null },
  "recommendation": "specific fertilizer recommendation for Indian farmer in 2-3 sentences",
  "suitableCrops": ["crop1", "crop2", "crop3"]
}

Only extract farmerName and zoneId if they are clearly printed on the report. Do not guess them from the app UI. If the report has a separate fertilizer requirement/recommendation row, put those numbers in requirements, not in nitrogen/phosphorus/potassium. If a soil test value is not found, use null. If the image is not a soil report, return ph: 7.0 and fertility: "Unknown".`;

  const rawJson = await callGeminiVision(base64, file.type, prompt);
  const parsed = JSON.parse(rawJson);

  return {
    farmerName: parsed.farmerName || parsed.userName || parsed.ownerName || null,
    zoneId: parsed.zoneId || parsed.zoneID || parsed.zone || null,
    nitrogen: numberOrNull(parsed.nitrogen),
    phosphorus: numberOrNull(parsed.phosphorus),
    potassium: numberOrNull(parsed.potassium),
    ph: numberOrNull(parsed.ph) ?? 7.0,
    organicCarbon: numberOrNull(parsed.organicCarbon),
    electricalConductivity: numberOrNull(parsed.electricalConductivity),
    zinc: numberOrNull(parsed.zinc),
    boron: numberOrNull(parsed.boron),
    fertility: parsed.fertility || 'Medium',
    ratings: parsed.ratings || {},
    requirements: parsed.requirements || {},
    recommendation: parsed.recommendation || '',
    suitableCrops: Array.isArray(parsed.suitableCrops) ? parsed.suitableCrops : [],
  };
}

async function inspectImageQuality(file) {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;

  return new Promise((resolve) => {
    image.onload = () => {
      const small = image.width < 720 || image.height < 720;
      resolve(
        small
          ? 'Photo may be too small or blurry. Try getting closer with better light.'
          : ''
      );
      URL.revokeObjectURL(url);
    };
  });
}

// Active learning: save farmer corrections
function saveFeedback(reportId, correct, disease) {
  try {
    const existing = JSON.parse(window.localStorage.getItem('ks-scan-feedback') || '[]');
    existing.push({ reportId, correct, disease, ts: Date.now() });
    window.localStorage.setItem('ks-scan-feedback', JSON.stringify(existing.slice(-50)));
  } catch {
    // Feedback is best-effort.
  }
}

function ConfidenceRing({ confidence = 0 }) {
  const r = 28;
  const cx = 36;
  const circumference = 2 * Math.PI * r;
  const fill = Math.min(100, Math.max(0, confidence));
  const offset = circumference * (1 - fill / 100);
  const color = fill >= 80 ? '#16a34a' : fill >= 60 ? '#d97706' : '#dc2626';
  return (
    <div className="relative flex h-[72px] w-[72px] items-center justify-center">
      <svg width={72} height={72} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#e5e7eb" strokeWidth={6} />
        <circle
          cx={cx} cy={cx} r={r} fill="none"
          stroke={color} strokeWidth={6}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-black" style={{ color }}>{fill}%</span>
      </div>
    </div>
  );
}

export default function ScannerScreen() {
  const navigate = useNavigate();
  const language = useSettingsStore((state) => state.language);
  const ownerName = useSettingsStore((state) => state.ownerName);
  const zones = useZoneStore((state) => state.zones);
  const saveSoilReport = useZoneStore((state) => state.saveSoilReport);
  const loginWithPin = useAuthStore((state) => state.loginWithPin);
  const fileInputRef = useRef(null);
  const zoneList = useMemo(() => Object.values(zones || {}), [zones]);

  const [mode, setMode] = useState('pest');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(() => readReports());
  const [qualityWarning, setQualityWarning] = useState('');
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong'
  const [selectedZoneId, setSelectedZoneId] = useState(() => zoneList[0]?.id || '');
  const [soilApplied, setSoilApplied] = useState(null);
  const [pendingSoilApply, setPendingSoilApply] = useState(null);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState('');
  const [reviewRequestId, setReviewRequestId] = useState('');

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  useEffect(() => {
    if (!reviewRequestId) return undefined;

    const syncReviewStatus = () => {
      const review = readSoilReportReviewQueue().find((item) => item.id === reviewRequestId);
      if (!review) return;

      if (review.status === 'approved') {
        setSoilApplied({
          status: 'applied',
          zoneId: review.zoneId,
          zoneName: review.zoneName,
          message: `Agronomist approved this report for ${review.zoneName}. Zone data and fertigation recommendation are updated.`,
        });
        setPendingSoilApply(null);
        setReviewRequestId('');
      }

      if (review.status === 'rejected') {
        setSoilApplied({
          status: 'blocked',
          message: `Agronomist rejected this report for ${review.zoneName}. Zone data was not changed.`,
        });
        setPendingSoilApply(null);
        setReviewRequestId('');
      }
    };

    syncReviewStatus();
    window.addEventListener('storage', syncReviewStatus);
    window.addEventListener('soil-report-review-queue-changed', syncReviewStatus);
    return () => {
      window.removeEventListener('storage', syncReviewStatus);
      window.removeEventListener('soil-report-review-queue-changed', syncReviewStatus);
    };
  }, [reviewRequestId]);

  const handleFile = async (event) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;

    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
    setResult(null);
    setSoilApplied(null);
    setPendingSoilApply(null);
    setReviewRequestId('');
    setQualityWarning(await inspectImageQuality(nextFile));
  };

  const runAnalysis = async () => {
    if (!file) return;
    setLoading(true);
    setFeedback(null);

    try {
      if (mode === 'pest') {
        const pest = await analyzePestImage(file);
        // Enrich with PlantVillage/CCMT KB data
        const enriched = enrichPestResult(pest, language === 'hi' ? 'wheat' : 'tomato');
        setResult({ type: 'pest', ...enriched });
      } else {
        const soil = await analyzeSoilImage(file);
        setResult({ type: 'soil', ...soil });
      }
    } catch (error) {
      setResult({
        type: mode,
        error: error.message || 'Unable to analyze this image right now.',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveReport = () => {
    if (!result) return;

    const report = {
      id: `report-${Date.now()}`,
      createdAt: Date.now(),
      type: result.type,
      title: result.type === 'pest' ? result.disease : 'Soil Report',
      summary:
        result.type === 'pest'
          ? `${result.disease} · ${result.confidence}%`
          : `N ${result.nitrogen} / P ${result.phosphorus} / K ${result.potassium}`,
      data: result,
    };

    const nextReports = [report, ...history];
    setHistory(nextReports);
    writeReports(nextReports);
    return report;
  };

  const buildSoilReportPayload = (selectedZone, reportId, decision) => ({
    source: 'soil_report_scan',
    scanReportId: reportId,
    cropType: selectedZone.cropType,
    cropStage: selectedZone.cropStage || 'Vegetative',
    farmerName: result.farmerName || null,
    verificationStatus: 'farmer_confirmed',
    verificationConfidence: decision.confidence,
    appliedBy: ownerName || useZoneStore.getState().userName || 'Farmer',
    appliedAt: Date.now(),
    nitrogen: result.nitrogen,
    phosphorus: result.phosphorus,
    potassium: result.potassium,
    ph: result.ph,
    ec: result.electricalConductivity,
    organicCarbon: result.organicCarbon,
    fertility: result.fertility || '',
    ratings: result.ratings || {},
    requirements: result.requirements || {},
    recommendation: result.recommendation || '',
  });

  const applyConfirmedSoilReport = () => {
    if (!pendingSoilApply || !result || result.type !== 'soil') return;
    const selectedZone = zones?.[pendingSoilApply.zoneId];
    if (!selectedZone) return;
    const report = saveReport();

    saveSoilReport(pendingSoilApply.zoneId, buildSoilReportPayload(selectedZone, report?.id, pendingSoilApply.decision));

    setSoilApplied({
      status: 'applied',
      zoneId: pendingSoilApply.zoneId,
      zoneName: selectedZone.name,
      message: 'Report confirmed with farmer PIN. Fertigation will use this recommendation.',
    });
    setPendingSoilApply(null);
    setPinValue('');
    setPinError('');
  };

  const reviewSoilReportForZone = () => {
    if (!result || result.type !== 'soil' || !selectedZoneId) return;
    const selectedZone = zones?.[selectedZoneId];
    if (!selectedZone) return;

    const decision = classifySoilReportDecision({
      reportData: result,
      zone: selectedZone,
      appUserName: ownerName || useZoneStore.getState().userName,
    });

    if (decision.status === 'review') {
      const report = saveReport();
      const review = queueSoilReportReview({
        reportId: report?.id,
        zoneId: selectedZoneId,
        zoneName: selectedZone.name,
        farmerName: result.farmerName || null,
        appUserName: ownerName || useZoneStore.getState().userName || '',
        reasons: decision.reasons,
        changes: decision.changes,
        reportData: result,
      });
      setSoilApplied({
        status: 'review',
        reviewId: review?.id,
        message: review
          ? `${decision.title}: ${decision.message}`
          : `${decision.title}: Unable to queue locally, but no zone values were changed.`,
      });
      setReviewRequestId(review?.id || '');
      return;
    }

    if (decision.status === 'blocked') {
      setSoilApplied({ status: 'blocked', message: decision.message });
      return;
    }

    setPendingSoilApply({ zoneId: selectedZoneId, zoneName: selectedZone.name, decision });
    setSoilApplied({
      status: 'pending',
      message: `${decision.title}: ${decision.message}`,
    });
  };

  const verifyPinAndApply = async () => {
    setPinError('');
    const accepted = await loginWithPin(pinValue);
    if (!accepted) {
      setPinError('PIN does not match. Report was not applied.');
      setPinValue('');
      return;
    }
    applyConfirmedSoilReport();
  };

  const tips = [
    {
      key: 'close',
      icon: <Camera size={20} className="text-[#1a3d1a]" />,
      title: localize({ hi: 'एक पत्ता करीब से', mr: 'एक पान जवळून', en: 'Single leaf close-up' }, language),
    },
    {
      key: 'light',
      icon: <SunMedium size={20} className="text-[#d97706]" />,
      title: localize({ hi: 'अच्छी रोशनी', mr: 'चांगला प्रकाश', en: 'Good daylight' }, language),
    },
    {
      key: 'clear',
      icon: <Sparkles size={20} className="text-[#2563eb]" />,
      title: localize({ hi: 'धुंधली फोटो नहीं', mr: 'धूसर फोटो नको', en: 'Avoid blur' }, language),
    },
    {
      key: 'issue',
      icon: <ScanSearch size={20} className="text-[#7c3aed]" />,
      title: localize({ hi: 'रोग वाला हिस्सा दिखाएं', mr: 'रोगग्रस्त भाग दाखवा', en: 'Show infected area' }, language),
    },
  ];

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-text-primary"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-[30px] font-black leading-none text-text-primary">AI Scanner</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {mode === 'pest'
              ? localize({ hi: 'AI द्वारा रोग और कीट पहचान', mr: 'AI द्वारे रोग आणि कीड ओळख', en: 'AI crop issue detection' }, language)
              : localize({ hi: 'रिपोर्ट की फोटो से नंबर पढ़ें', mr: 'रिपोर्टच्या फोटोमधून मूल्ये वाचा', en: 'Read values from a soil report photo' }, language)}
          </p>
        </div>
      </div>

      <div className="mb-4 flex rounded-full border border-border bg-white p-1 shadow-[0_12px_24px_rgba(15,23,42,0.04)]">
        <button
          type="button"
          onClick={() => {
            setMode('pest');
            setResult(null);
          }}
          className={`flex-1 rounded-full px-4 py-3 text-sm font-black ${
            mode === 'pest' ? 'bg-[#1a3d1a] text-white' : 'text-text-secondary'
          }`}
        >
          {localize({ hi: 'रोग पहचान', mr: 'रोग ओळख', en: 'Pest & disease' }, language)}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('soil');
            setResult(null);
          }}
          className={`flex-1 rounded-full px-4 py-3 text-sm font-black ${
            mode === 'soil' ? 'bg-[#1a3d1a] text-white' : 'text-text-secondary'
          }`}
        >
          {localize({ hi: 'मिट्टी रिपोर्ट', mr: 'माती रिपोर्ट', en: 'Soil report' }, language)}
        </button>
      </div>

      {!preview ? (
        <div className="rounded-[28px] border border-border bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
          {mode === 'pest' ? (
            <>
              <h2 className="text-lg font-black text-text-primary">
                {localize({ hi: 'ऐसी फोटो लें', mr: 'अशी फोटो काढा', en: 'Capture the photo like this' }, language)}
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {tips.map((tip) => (
                  <div key={tip.key} className="rounded-[22px] border border-[#e6eee4] bg-[#f7faf5] p-4">
                    <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
                      {tip.icon}
                    </div>
                    <p className="text-sm font-black text-text-primary">{tip.title}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-[22px] border border-[#e6eee4] bg-[#f7faf5] p-5 text-sm text-text-secondary">
              {localize(
                {
                  hi: 'मिट्टी परीक्षण रिपोर्ट की साफ फोटो अपलोड करें। फोटो से नंबर अपने आप पढ़े जाएंगे।',
                  mr: 'माती तपासणी अहवालाचा स्वच्छ फोटो अपलोड करा. फोटोतील संख्या आपोआप वाचल्या जातील.',
                  en: 'Upload a clear photo of the soil test report. Values will be read automatically from the image.',
                },
                language
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-5 flex w-full flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-[#c9ddc5] bg-[#f7faf5] px-4 py-10 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-white text-[#1a3d1a] shadow-sm">
              <ImagePlus size={28} />
            </div>
            <p className="mt-4 text-lg font-black text-text-primary">
              {localize(
                {
                  hi: 'फोटो खींचें या गैलरी से चुनें',
                  mr: 'फोटो काढा किंवा गॅलरीतून निवडा',
                  en: 'Take a photo or choose from gallery',
                },
                language
              )}
            </p>
            <p className="mt-1 text-sm text-text-secondary">JPG, PNG, WebP</p>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

          {!history.length ? (
            <div className="mt-5 rounded-[22px] border border-dashed border-[#d7e4d5] bg-[#fbfdfb] p-5 text-center">
              <p className="text-sm font-black text-text-primary">
                {localize({ hi: 'पहला स्कैन अभी करें', mr: 'पहिला स्कॅन आत्ताच करा', en: 'Run your first scan now' }, language)}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {localize(
                  {
                    hi: 'रिपोर्ट सेव होने के बाद आपकी स्कैन हिस्ट्री यहाँ दिखेगी।',
                    mr: 'रिपोर्ट सेव झाल्यावर तुमचा स्कॅन इतिहास येथे दिसेल.',
                    en: 'Your saved scan history will appear here after the first report is stored.',
                  },
                  language
                )}
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-[28px] border border-border bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
          <div className="overflow-hidden rounded-[24px] border border-border">
            <img src={preview} alt="Uploaded crop" className="h-64 w-full object-cover" />
          </div>

          {qualityWarning ? (
            <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-700">{qualityWarning}</div>
          ) : null}

          {!result && !loading ? (
            <button
              type="button"
              onClick={runAnalysis}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1a3d1a] px-4 py-4 text-sm font-black text-white"
            >
              <UploadCloud size={18} />
              {mode === 'pest'
                ? localize({ hi: 'AI से पहचान करें', mr: 'AI ने ओळखा', en: 'Analyze with AI' }, language)
                : localize({ hi: 'रिपोर्ट पढ़ें', mr: 'रिपोर्ट वाचा', en: 'Read report' }, language)}
            </button>
          ) : null}

          {loading ? (
            <div className="mt-5 flex items-center justify-center gap-3 rounded-2xl bg-[#f7faf5] px-4 py-5 text-sm font-black text-[#1a3d1a]">
              <Loader2 size={18} className="animate-spin" />
              {localize({ hi: 'AI आपकी फोटो पढ़ रहा है...', mr: 'AI तुमची फोटो वाचत आहे...', en: 'AI is reading your image...' }, language)}
            </div>
          ) : null}

          {result?.error ? <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{result.error}</div> : null}

          {result?.type === 'pest' ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-[24px] bg-[#f7faf5] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-text-secondary">
                      {localize({ hi: 'पहचान', mr: 'ओळख', en: 'Detected issue' }, language)}
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-text-primary">{result.disease}</h2>
                    <p className="mt-2 text-sm text-text-secondary">{result.treatment}</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <Brain size={12} className="text-[#1a3d1a]" />
                      <span className="text-[11px] font-bold text-[#1a3d1a] uppercase tracking-wider">AI Vision Model</span>
                      {result.kbValidated && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                          ✓ PlantVillage KB
                        </span>
                      )}
                    </div>
                  </div>
                  <ConfidenceRing confidence={result.confidence} />
                </div>
              </div>

              {/* Active Learning Feedback */}
              <div className="rounded-[22px] border border-[#dde8db] bg-[#f7faf5] px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary">
                  {localize({ hi: 'क्या यह सही है?', mr: 'हे बरोबर आहे का?', en: 'Was this correct?' }, language)}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setFeedback('correct'); saveFeedback(result.disease + Date.now(), true, result.disease); }}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition ${
                      feedback === 'correct' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-border bg-white text-text-primary'
                    }`}
                  >
                    <ThumbsUp size={16} />
                    {localize({ hi: 'हाँ, सही', mr: 'हो, बरोबर', en: 'Yes, correct' }, language)}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFeedback('wrong'); saveFeedback(result.disease + Date.now(), false, result.disease); }}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition ${
                      feedback === 'wrong' ? 'border-red-400 bg-red-50 text-red-700' : 'border-border bg-white text-text-primary'
                    }`}
                  >
                    <ThumbsDown size={16} />
                    {localize({ hi: 'नहीं, गलत', mr: 'नाही, चुकीचे', en: 'No, wrong' }, language)}
                  </button>
                </div>
                {feedback && (
                  <p className="mt-2 text-center text-xs text-text-secondary">
                    {localize({ hi: 'धन्यवाद! AI बेहतर होगा।', mr: 'धन्यवाद! AI सुधारेल.', en: 'Thanks! Helps improve AI.' }, language)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'severity', label: localize({ hi: 'गंभीरता', mr: 'गंभीरता', en: 'Severity' }, language), value: result.severity },
                  { key: 'cost', label: localize({ hi: 'लागत', mr: 'खर्च', en: 'Cost' }, language), value: result.cost },
                  { key: 'dose', label: localize({ hi: 'डोज़', mr: 'डोस', en: 'Dose' }, language), value: result.dosage },
                  { key: 'method', label: localize({ hi: 'तरीका', mr: 'पद्धत', en: 'Method' }, language), value: result.method },
                  ...(result.affectedPart ? [{ key: 'part', label: localize({ hi: 'प्रभावित भाग', mr: 'प्रभावित भाग', en: 'Affected part' }, language), value: result.affectedPart }] : []),
                  ...(result.pest ? [{ key: 'pest', label: localize({ hi: 'वैज्ञानिक नाम', mr: 'शास्त्रीय नाव', en: 'Scientific name' }, language), value: result.pest }] : []),
                ].map((item) => (
                  <div key={item.key} className="rounded-[22px] bg-[#f7faf5] p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-secondary">{item.label}</p>
                    <p className="mt-2 text-sm font-black text-text-primary">{item.value}</p>
                  </div>
                ))}
              </div>

              {result.preventionTip && (
                <div className="rounded-[22px] bg-amber-50 border border-amber-200 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">
                    {localize({ hi: 'बचाव के उपाय', mr: 'प्रतिबंध उपाय', en: 'Prevention tip' }, language)}
                  </p>
                  <p className="mt-2 text-sm text-amber-900">{result.preventionTip}</p>
                </div>
              )}


              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => window.open('https://www.google.com/maps/search/agri+shop+near+me', '_blank', 'noopener,noreferrer')}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-[#1a3d1a] px-4 py-4 text-sm font-black text-[#1a3d1a]"
                >
                  <Store size={18} />
                  {localize({ hi: 'नज़दीकी कृषि दुकान', mr: 'जवळचे कृषी दुकान', en: 'Nearby agri shop' }, language)}
                </button>
                <button
                  type="button"
                  onClick={saveReport}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[#1a3d1a] px-4 py-4 text-sm font-black text-white"
                >
                  <CheckCircle2 size={18} />
                  {localize({ hi: 'रिपोर्ट सेव करें', mr: 'रिपोर्ट जतन करा', en: 'Save report' }, language)}
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  shareScanResult({
                    disease: result.disease,
                    confidence: `${result.confidence}%`,
                    treatment: `${result.treatment} | ${result.dosage} | ${result.method}`,
                  })
                }
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#cfe2cf] bg-[#f6fbf5] px-4 py-4 text-sm font-black text-[#1a3d1a]"
              >
                <Share2 size={16} />
                {localize({ hi: 'WhatsApp पर भेजें', mr: 'WhatsApp वर पाठवा', en: 'Share on WhatsApp' }, language)}
              </button>
            </div>
          ) : null}

          {result?.type === 'soil' ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-[24px] border border-[#d8e8d4] bg-[#f7faf5] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary">Review before apply</p>
                    <p className="mt-1 text-sm text-text-secondary">
                      Lab reports often have only a farmer name. Select the zone, review the changes, then confirm with PIN.
                    </p>
                  </div>
                  <ShieldCheck size={20} className="text-[#1a3d1a]" />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-text-secondary">Report user</p>
                    <p className="mt-1 text-sm font-black text-text-primary">{result.farmerName || 'Missing'}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-text-secondary">Selected zone</p>
                    <p className="mt-1 text-sm font-black text-text-primary">{zones?.[selectedZoneId]?.name || 'Select zone'}</p>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <select
                    value={selectedZoneId}
                    onChange={(event) => {
                      setSelectedZoneId(event.target.value);
                      setSoilApplied(null);
                      setReviewRequestId('');
                    }}
                    className="h-12 rounded-2xl border border-border bg-white px-4 text-sm font-black text-text-primary outline-none"
                  >
                    {zoneList.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name} ({zone.id})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={reviewSoilReportForZone}
                    disabled={!selectedZoneId}
                    className="rounded-2xl bg-[#1a3d1a] px-4 py-4 text-sm font-black text-white disabled:bg-slate-300"
                  >
                    Review changes
                  </button>
                </div>

                {pendingSoilApply ? (
                  <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <p className="text-sm font-black text-emerald-900">{pendingSoilApply.decision.title}</p>
                    <p className="mt-1 text-xs font-semibold text-emerald-800">{pendingSoilApply.decision.message}</p>
                    <div className="mt-3 grid gap-2">
                      {pendingSoilApply.decision.changes.slice(0, 5).map((change) => (
                        <div key={change.key} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700">
                          <span>{change.label}</span>
                          <span>
                            {change.current ?? '--'} {'->'} {change.next} {change.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        value={pinValue}
                        onChange={(event) => setPinValue(event.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="Enter farmer PIN"
                        className="h-12 rounded-2xl border border-emerald-200 bg-white px-4 text-sm font-black text-text-primary outline-none"
                      />
                      <button
                        type="button"
                        onClick={verifyPinAndApply}
                        disabled={pinValue.length !== 4}
                        className="rounded-2xl bg-[#1a3d1a] px-4 py-3 text-sm font-black text-white disabled:bg-slate-300"
                      >
                        Confirm & apply
                      </button>
                    </div>
                    {pinError ? <p className="mt-2 text-xs font-bold text-red-700">{pinError}</p> : null}
                  </div>
                ) : null}

                {soilApplied ? (
                  <div
                    className={`mt-3 rounded-2xl border px-4 py-3 text-sm font-bold ${
                      soilApplied.status === 'applied'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : soilApplied.status === 'pending'
                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                        : soilApplied.status === 'review'
                        ? 'border-blue-200 bg-blue-50 text-blue-800'
                        : 'border-red-200 bg-red-50 text-red-800'
                    }`}
                  >
                    {soilApplied.status === 'applied' ? (
                      <>
                        {soilApplied.message || `Report applied to ${soilApplied.zoneName}. Fertigation will now use this soil report.`}
                        <button type="button" onClick={() => navigate(`/zone/${soilApplied.zoneId}`)} className="ml-2 font-black underline">
                          Open zone
                        </button>
                      </>
                    ) : (
                      soilApplied.message
                    )}
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'N', label: 'Nitrogen', value: result.nitrogen, unit: 'kg/ha' },
                  { key: 'P', label: 'Phosphorus', value: result.phosphorus, unit: 'kg/ha' },
                  { key: 'K', label: 'Potassium', value: result.potassium, unit: 'kg/ha' },
                  { key: 'ph', label: 'pH', value: result.ph, unit: '' },
                  ...(result.organicCarbon ? [{ key: 'oc', label: 'Organic Carbon', value: result.organicCarbon, unit: '%' }] : []),
                  ...(result.electricalConductivity != null ? [{ key: 'ec', label: 'EC', value: result.electricalConductivity, unit: 'dS/m' }] : []),
                  ...(result.zinc != null ? [{ key: 'zn', label: 'Zinc', value: result.zinc, unit: 'ppm' }] : []),
                  ...(result.boron != null ? [{ key: 'b', label: 'Boron', value: result.boron, unit: 'ppm' }] : []),
                ].map((item) => (
                  <div key={item.key} className="rounded-[22px] bg-[#f7faf5] p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-secondary">{item.label}</p>
                    <p className="mt-2 text-2xl font-black text-text-primary">
                      {item.value ?? '--'}
                      {item.unit && <span className="ml-1 text-sm text-text-secondary">{item.unit}</span>}
                    </p>
                  </div>
                ))}
              </div>

              {/* Fertility rating */}
              {result.fertility && (
                <div className={`rounded-[22px] px-4 py-3 border ${
                  result.fertility === 'High' ? 'bg-emerald-50 border-emerald-200' :
                  result.fertility === 'Low' ? 'bg-red-50 border-red-200' :
                  'bg-amber-50 border-amber-200'
                }`}>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary">
                    {localize({ hi: 'उर्वरता', mr: 'सुपीकता', en: 'Soil fertility' }, language)}
                  </p>
                  <p className={`mt-1 text-xl font-black ${
                    result.fertility === 'High' ? 'text-emerald-700' :
                    result.fertility === 'Low' ? 'text-red-700' : 'text-amber-700'
                  }`}>{result.fertility}</p>
                </div>
              )}

              {/* AI Recommendation */}
              {result.recommendation && (
                <div className="rounded-[24px] bg-[#edf6ec] border border-[#c8e0c6] p-4">
                  <div className="flex items-center gap-2 text-sm font-black text-[#1a3d1a]">
                    <Brain size={16} />
                    {localize({ hi: 'AI सिफारिश', mr: 'AI शिफारस', en: 'AI Recommendation' }, language)}
                  </div>
                  <p className="mt-2 text-sm text-[#1a3d1a] leading-relaxed">{result.recommendation}</p>
                </div>
              )}

              {/* Suitable crops */}
              {result.suitableCrops?.length > 0 && (
                <div className="rounded-[22px] bg-[#f7faf5] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-secondary mb-2">
                    {localize({ hi: 'उपयुक्त फसलें', mr: 'योग्य पिके', en: 'Suitable crops' }, language)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.suitableCrops.map((crop) => (
                      <span key={crop} className="rounded-full bg-[#1a3d1a] px-3 py-1 text-xs font-black text-white capitalize">{crop}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={saveReport}
                  className="rounded-2xl bg-[#1a3d1a] px-4 py-4 text-sm font-black text-white"
                >
                  {localize({ hi: 'रिपोर्ट सेव करें', mr: 'रिपोर्ट जतन करा', en: 'Save report' }, language)}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    shareWhatsApp(`Soil report: N ${result.nitrogen}, P ${result.phosphorus}, K ${result.potassium}, pH ${result.ph}. ${result.recommendation || ''}`)
                  }
                  className="rounded-2xl border border-[#cfe2cf] bg-[#f6fbf5] px-4 py-4 text-sm font-black text-[#1a3d1a]"
                >
                  {localize({ hi: 'WhatsApp शेयर', mr: 'WhatsApp शेअर', en: 'Share on WhatsApp' }, language)}
                </button>
              </div>
            </div>
          ) : null}

        </div>
      )}

      {history.length ? (
        <div className="mt-6 rounded-[28px] border border-border bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black text-text-primary">
              {localize({ hi: 'स्कैन हिस्ट्री', mr: 'स्कॅन इतिहास', en: 'Scan history' }, language)}
            </h2>
            <span className="rounded-full bg-[#edf6ec] px-3 py-2 text-xs font-black text-[#1a3d1a]">{history.length}</span>
          </div>
          <div className="space-y-3">
            {history.slice(0, 5).map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => navigate(`/scanner/report/${report.id}`)}
                className="flex w-full items-center justify-between rounded-2xl bg-[#f7faf5] px-4 py-3 text-left"
              >
                <div>
                  <p className="font-black text-text-primary">{report.title}</p>
                  <p className="text-sm text-text-secondary">{report.summary}</p>
                </div>
                <p className="text-xs font-semibold text-slate-500">{formatRelativeTime(report.createdAt, language)}</p>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
