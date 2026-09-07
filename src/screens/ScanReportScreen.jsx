import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Beaker, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { useSettingsStore } from '../store/settingsStore.js';
import { useZoneStore } from '../store/zoneStore.js';
import { useAuthStore } from '../store/authStore.js';
import { formatRelativeTime, localize } from '../utils/formatters.js';
import {
  classifySoilReportDecision,
  getReportFarmerName,
  queueSoilReportReview,
  readSoilReportReviewQueue,
} from '../utils/soilReportGuard.js';

const REPORT_STORAGE_KEY = 'ks-scan-reports';

function readReports() {
  try {
    return JSON.parse(window.localStorage.getItem(REPORT_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function reportValue(report, key) {
  if (key === 'ec') return report.data?.electricalConductivity ?? report.data?.ec ?? null;
  return report.data?.[key] ?? null;
}

export default function ScanReportScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const language = useSettingsStore((state) => state.language);
  const ownerName = useSettingsStore((state) => state.ownerName);
  const zones = useZoneStore((state) => state.zones);
  const saveSoilReport = useZoneStore((state) => state.saveSoilReport);
  const loginWithPin = useAuthStore((state) => state.loginWithPin);
  const report = readReports().find((item) => item.id === id);
  const zoneList = useMemo(() => Object.values(zones || {}), [zones]);
  const [selectedZoneId, setSelectedZoneId] = useState(zoneList[0]?.id || '');
  const [applyState, setApplyState] = useState(null);
  const [pendingApply, setPendingApply] = useState(null);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState('');
  const [reviewRequestId, setReviewRequestId] = useState('');

  if (!report) {
    return null;
  }

  const isSoilReport = report.type === 'soil' || report.data?.type === 'soil';
  const selectedZone = zones?.[selectedZoneId];

  useEffect(() => {
    if (!reviewRequestId) return undefined;

    const syncReviewStatus = () => {
      const review = readSoilReportReviewQueue().find((item) => item.id === reviewRequestId);
      if (!review) return;

      if (review.status === 'approved') {
        setApplyState({
          status: 'applied',
          zoneId: review.zoneId,
          zoneName: review.zoneName,
          message: `Agronomist approved this report for ${review.zoneName}. Zone data and fertigation recommendation are updated.`,
        });
        setPendingApply(null);
        setReviewRequestId('');
      }

      if (review.status === 'rejected') {
        setApplyState({
          status: 'blocked',
          message: `Agronomist rejected this report for ${review.zoneName}. Zone data was not changed.`,
        });
        setPendingApply(null);
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

  const reviewForZone = () => {
    if (!isSoilReport || !selectedZone) return;

    const decision = classifySoilReportDecision({
      reportData: report.data,
      zone: selectedZone,
      appUserName: ownerName || useZoneStore.getState().userName,
    });

    if (decision.status === 'review') {
      const review = queueSoilReportReview({
        reportId: report.id,
        zoneId: selectedZoneId,
        zoneName: selectedZone.name,
        farmerName: getReportFarmerName(report.data),
        appUserName: ownerName || useZoneStore.getState().userName || '',
        reasons: decision.reasons,
        changes: decision.changes,
        reportData: report.data,
      });
      setReviewRequestId(review?.id || '');
      setPendingApply(null);
      setApplyState({ status: 'review', message: `${decision.title}: ${decision.message}` });
      return;
    }

    if (decision.status === 'blocked') {
      setPendingApply(null);
      setApplyState({ status: 'blocked', message: decision.message });
      return;
    }

    setPendingApply({ zoneId: selectedZoneId, zoneName: selectedZone.name, decision });
    setApplyState({ status: 'pending', message: `${decision.title}: ${decision.message}` });
  };

  const executeApply = () => {
    if (!pendingApply || !selectedZone) return;

    saveSoilReport(pendingApply.zoneId, {
      source: 'soil_report_scan',
      scanReportId: report.id,
      cropType: selectedZone.cropType,
      cropStage: selectedZone.cropStage || 'Vegetative',
      farmerName: getReportFarmerName(report.data) || null,
      verificationStatus: 'farmer_confirmed',
      verificationConfidence: pendingApply.decision.confidence,
      appliedBy: ownerName || useZoneStore.getState().userName || 'Farmer',
      appliedAt: Date.now(),
      nitrogen: reportValue(report, 'nitrogen'),
      phosphorus: reportValue(report, 'phosphorus'),
      potassium: reportValue(report, 'potassium'),
      ph: reportValue(report, 'ph'),
      ec: reportValue(report, 'ec'),
      organicCarbon: reportValue(report, 'organicCarbon'),
      fertility: report.data?.fertility || '',
      ratings: report.data?.ratings || {},
      requirements: report.data?.requirements || {},
      recommendation: report.data?.recommendation || '',
    });

    setApplyState({
      status: 'applied',
      zoneId: pendingApply.zoneId,
      zoneName: pendingApply.zoneName,
      message: `Report applied to ${pendingApply.zoneName}. Fertigation will use this confirmed recommendation.`,
    });
    setPendingApply(null);
    setPinValue('');
    setPinError('');
  };

  const verifyPinAndApply = async () => {
    setPinError('');
    const accepted = await loginWithPin(pinValue);
    if (!accepted) {
      setPinError('PIN does not match. Report was not applied.');
      setPinValue('');
      return;
    }
    executeApply();
  };

  const resultTiles = [
    { key: 'nitrogen', label: 'Nitrogen', value: reportValue(report, 'nitrogen'), unit: 'kg/ha' },
    { key: 'phosphorus', label: 'Phosphorus', value: reportValue(report, 'phosphorus'), unit: 'kg/ha' },
    { key: 'potassium', label: 'Potassium', value: reportValue(report, 'potassium'), unit: 'kg/ha' },
    { key: 'ph', label: 'pH', value: reportValue(report, 'ph'), unit: '' },
    { key: 'organicCarbon', label: 'Organic Carbon', value: reportValue(report, 'organicCarbon'), unit: '%' },
    { key: 'ec', label: 'EC', value: reportValue(report, 'ec'), unit: 'dS/m' },
  ].filter((item) => item.value != null);

  return (
    <div className="min-h-[100dvh] bg-[#f4f9f2] px-4 pt-4 pb-8">
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-text-primary"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-text-primary">{report.title}</h1>
          <p className="text-sm text-text-secondary">{formatRelativeTime(report.createdAt, language)}</p>
        </div>
      </div>

      <div className="rounded-[28px] border border-border bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        <p className="text-sm text-text-secondary">{report.summary}</p>
        <pre className="mt-4 max-h-64 overflow-auto rounded-2xl bg-[#f7faf5] p-4 text-sm text-text-primary">
          {JSON.stringify(report.data, null, 2)}
        </pre>
      </div>

      {isSoilReport ? (
        <div className="mt-4 rounded-[28px] border border-[#dbe7d4] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
          <div className="mb-4 flex items-start gap-3">
            <div className="rounded-2xl bg-[#eef6ed] p-3 text-[#1a3d1a]">
              <Beaker size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-text-primary">Review before fertigation</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Select the field zone yourself. The report creates a recommendation first; it changes zone data only after farmer PIN confirmation.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="grid grid-cols-2 gap-3 sm:col-span-2">
              <div className="rounded-2xl bg-[#f7faf5] px-3 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-text-secondary">Report farmer</p>
                <p className="mt-1 text-sm font-black text-text-primary">
                  {getReportFarmerName(report.data) || 'Missing'}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f7faf5] px-3 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-text-secondary">Selected zone</p>
                <p className="mt-1 text-sm font-black text-text-primary">{selectedZone?.name || 'Select zone'}</p>
              </div>
            </div>

            <select
              value={selectedZoneId}
              onChange={(event) => {
                setSelectedZoneId(event.target.value);
                setPendingApply(null);
                setApplyState(null);
                setReviewRequestId('');
              }}
              className="h-12 rounded-2xl border border-border bg-[#f7faf5] px-4 text-sm font-black text-text-primary outline-none"
            >
              {zoneList.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name} ({zone.id})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={reviewForZone}
              disabled={!selectedZoneId}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1a3d1a] px-4 py-3 text-sm font-black text-white disabled:bg-slate-300"
            >
              <ShieldCheck size={16} />
              Review changes
            </button>
          </div>

          {pendingApply ? (
            <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-sm font-black text-emerald-900">{pendingApply.decision.title}</p>
              <p className="mt-1 text-xs font-semibold text-emerald-800">{pendingApply.decision.message}</p>
              <div className="mt-3 grid gap-2">
                {pendingApply.decision.changes.slice(0, 5).map((change) => (
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

          {applyState ? (
            <div
              className={`mt-3 rounded-2xl border px-4 py-3 text-sm font-bold ${
                applyState.status === 'applied'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : applyState.status === 'pending'
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : applyState.status === 'review'
                  ? 'border-blue-200 bg-blue-50 text-blue-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {applyState.status === 'applied' ? (
                <>
                  {applyState.message}
                  <button type="button" onClick={() => navigate(`/zone/${applyState.zoneId}`)} className="ml-2 font-black underline">
                    Open zone
                  </button>
                </>
              ) : (
                applyState.message
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {resultTiles.length ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {resultTiles.map((item) => (
            <div key={item.key} className="rounded-[22px] bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-secondary">{item.label}</p>
              <p className="mt-2 text-2xl font-black text-text-primary">
                {item.value}
                {item.unit ? <span className="ml-1 text-sm text-text-secondary">{item.unit}</span> : null}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {isSoilReport && report.data?.recommendation ? (
        <div className="mt-4 rounded-[24px] border border-[#c8e0c6] bg-[#edf6ec] p-4">
          <div className="flex items-center gap-2 text-sm font-black text-[#1a3d1a]">
            <CheckCircle2 size={16} />
            AI Recommendation
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[#1a3d1a]">{report.data.recommendation}</p>
        </div>
      ) : null}
    </div>
  );
}
