import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Cpu,
  MapPin,
  Phone,
  ScanLine,
  User,
  Video,
  Wheat,
  Zap,
} from 'lucide-react';

/* ─── Uses native BarcodeDetector API (Chrome/Edge) with video stream ─── */
export default function AdminQRScanner() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  const [scanResult, setScanResult] = useState(null);
  const [parsedFarmer, setParsedFarmer] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);

  /* ─── Start camera & BarcodeDetector ─── */
  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }

      // Check BarcodeDetector support
      if (!('BarcodeDetector' in window)) {
        setCameraError('QR scanning requires Chrome/Edge 90+. Use Demo Scan below to test.');
        return;
      }

      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });

      const scan = async () => {
        if (!videoRef.current || scanResult) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) {
            handleResult(codes[0].rawValue);
            return;
          }
        } catch {
          // Frame not ready yet
        }
        rafRef.current = requestAnimationFrame(scan);
      };
      rafRef.current = requestAnimationFrame(scan);
    } catch (err) {
      setCameraError(`Camera unavailable: ${err.message}`);
    }
  }

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }

  useEffect(() => () => stopCamera(), []);

  function handleResult(text) {
    stopCamera();
    setScanResult(text);
    try {
      const data = JSON.parse(text);
      if (data.app === 'KrishiSarth') setParsedFarmer(data);
    } catch {
      // Raw text
    }
  }

  function reset() {
    setScanResult(null);
    setParsedFarmer(null);
    setCameraError(null);
    setCameraActive(false);
  }

  function demoScan() {
    handleResult(
      JSON.stringify({
        id: 'KS-PUN-RAM-WH045',
        name: 'Ramesh Patil',
        phone: '+917888029290',
        district: 'Pune',
        village: 'Pimpri',
        acres: 4.5,
        app: 'KrishiSarth',
      })
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top bar */}
      <div className="flex items-center gap-4 border-b border-slate-800 px-6 py-4">
        <button
          type="button"
          onClick={() => navigate('/admin-portal/dashboard')}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-black text-white">Farmer ID Scanner</h1>
          <p className="text-sm text-slate-400">Scan KrishiSarth QR codes to load farmer profiles</p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-8">
        {!scanResult ? (
          <>
            {/* Camera View */}
            <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50">
              <div className="relative aspect-square w-full bg-black">
                <video
                  ref={videoRef}
                  className={`h-full w-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                  playsInline
                  muted
                />
                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-800 text-slate-500">
                      <Video size={36} />
                    </div>
                    <p className="text-sm text-slate-500">Camera is not active</p>
                  </div>
                )}
                {/* Scan overlay */}
                {cameraActive && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="relative h-56 w-56">
                      <div className="absolute left-0 top-0 h-8 w-8 border-l-4 border-t-4 border-emerald-400 rounded-tl-lg" />
                      <div className="absolute right-0 top-0 h-8 w-8 border-r-4 border-t-4 border-emerald-400 rounded-tr-lg" />
                      <div className="absolute left-0 bottom-0 h-8 w-8 border-l-4 border-b-4 border-emerald-400 rounded-bl-lg" />
                      <div className="absolute right-0 bottom-0 h-8 w-8 border-r-4 border-b-4 border-emerald-400 rounded-br-lg" />
                      <div className="absolute left-4 right-4 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-emerald-400 opacity-70" />
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4">
                {cameraError && (
                  <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-300">
                    ⚠ {cameraError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={cameraActive ? stopCamera : startCamera}
                  className={`w-full rounded-2xl py-3 font-bold transition-colors ${
                    cameraActive
                      ? 'bg-red-600 text-white hover:bg-red-500'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500'
                  }`}
                >
                  {cameraActive ? 'Stop Camera' : '📷 Start Camera'}
                </button>
              </div>
            </div>

            <div className="my-5 flex items-center gap-4">
              <div className="flex-1 border-t border-slate-800" />
              <span className="text-sm text-slate-500">or test without camera</span>
              <div className="flex-1 border-t border-slate-800" />
            </div>

            <button
              type="button"
              onClick={demoScan}
              className="w-full rounded-2xl border border-slate-700 bg-slate-800 py-4 font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <ScanLine size={16} className="inline mr-2" />
              Demo Scan (Sample Farmer QR)
            </button>
          </>
        ) : (
          /* ─── Result Card ─── */
          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-900/10 p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">QR Scanned Successfully</h2>
                <p className="text-sm text-emerald-400">
                  {parsedFarmer ? 'KrishiSarth Farmer ID detected' : 'Unknown QR code'}
                </p>
              </div>
            </div>

            {parsedFarmer ? (
              <div className="mb-6">
                <div className="rounded-2xl bg-gradient-to-br from-emerald-800 to-teal-900 p-5">
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-emerald-300">Verified Farmer</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      { icon: <User size={14} />, label: 'Name', value: parsedFarmer.name },
                      { icon: <Cpu size={14} />, label: 'Farmer ID', value: parsedFarmer.id },
                      { icon: <Phone size={14} />, label: 'Phone', value: parsedFarmer.phone },
                      { icon: <MapPin size={14} />, label: 'Location', value: `${parsedFarmer.village}, ${parsedFarmer.district}` },
                      { icon: <Wheat size={14} />, label: 'Farm Size', value: `${parsedFarmer.acres} Acres` },
                    ].map(({ icon, label, value }) => (
                      <div key={label}>
                        <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
                          {icon} {label}
                        </div>
                        <p className="font-bold text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
                    <Zap size={14} className="text-emerald-300" />
                    <p className="text-xs font-bold text-emerald-200">Pro Subscriber · Verified</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/admin-portal/farmers')}
                  className="mt-3 w-full rounded-2xl bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-500 transition-colors"
                >
                  View in Farmer Directory →
                </button>
              </div>
            ) : (
              <div className="mb-6 rounded-2xl bg-slate-800 p-4 font-mono text-sm text-slate-300 break-all">
                {scanResult}
              </div>
            )}

            <button
              type="button"
              onClick={reset}
              className="w-full rounded-2xl border border-slate-700 bg-slate-800 py-3 font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Scan Another QR
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
