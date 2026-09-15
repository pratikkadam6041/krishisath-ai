import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Beaker,
  CheckCircle2,
  Clock3,
  History,
  Play,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useMqtt } from '../hooks/useMqtt.js';
import { useModeStore } from '../store/modeStore.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { useZoneStore } from '../store/zoneStore.js';
import { buildReportFromZone, createFertigationPlan, FERTIGATION_STAGES } from '../services/fertigationAdvisor.js';
import { localize } from '../utils/formatters.js';

function FieldInput({ label, value, onChange, suffix, step = '1' }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-text-secondary">{label}</span>
      <div className="flex h-12 items-center rounded-2xl border border-border bg-white px-3">
        <input
          type="number"
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm font-black text-text-primary outline-none"
        />
        {suffix ? <span className="text-xs font-bold text-text-secondary">{suffix}</span> : null}
      </div>
    </label>
  );
}

function formatSeconds(seconds) {
  if (!seconds) return '0s';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${mins}m ${rest}s` : `${mins}m`;
}

function getCheckTone(level) {
  if (level === 'block') return 'border-red-200 bg-red-50 text-red-800';
  return 'border-amber-200 bg-amber-50 text-amber-800';
}

const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

export default function FertigationAdvisor({ zoneId }) {
  const navigate = useNavigate();
  const language = useSettingsStore((state) => state.language);
  const zone = useZoneStore((state) => state.zones[zoneId]);
  const reports = useZoneStore((state) => {
    const zoneReports = state.soilReports?.[zoneId];
    return Array.isArray(zoneReports) ? zoneReports : EMPTY_ARRAY;
  });
  const history = useZoneStore((state) => (Array.isArray(state.fertigationHistory) ? state.fertigationHistory : EMPTY_ARRAY));
  const tanks = useZoneStore((state) => state.tanks || EMPTY_OBJECT);
  const calibration = useZoneStore((state) => state.fertigationCalibration || EMPTY_OBJECT);
  const saveSoilReport = useZoneStore((state) => state.saveSoilReport);
  const logFertigationEvent = useZoneStore((state) => state.logFertigationEvent);
  const isActMode = useModeStore((state) => state.mode === 'act');
  const mqtt = useMqtt();
  const activeReport = reports[0] || null;
  const reportIsVerified = activeReport?.source === 'soil_report_scan' && activeReport?.farmerName && activeReport?.zoneId;

  const [form, setForm] = useState(() => buildReportFromZone(zone, activeReport || {}));
  const [notice, setNotice] = useState('');
  
  const [manualDose, setManualDose] = useState({
    tankA: 0,
    tankB: 0,
    tankC: 0
  });

  const zoneHistory = useMemo(
    () => history.filter((event) => event.zoneId === zoneId).slice(0, 3),
    [history, zoneId]
  );
  const lastEvent = zoneHistory[0];

  useEffect(() => {
    if (!zone) return;
    setForm(buildReportFromZone(zone, activeReport || {}));
  }, [
    activeReport?.id,
    activeReport?.version,
    zone?.cropStage,
    zone?.ec,
    zone?.nitrogen,
    zone?.ph,
    zone?.phosphorus,
    zone?.potassium,
    zone,
  ]);

  const plan = useMemo(
    () =>
      createFertigationPlan({
        zone,
        report: { ...form, source: form.source || 'manual_entry' },
        tankLevels: tanks,
        calibration,
        lastEvent,
      }),
    [calibration, form, lastEvent, tanks, zone]
  );

  if (!zone) return null;

  const updateField = (key, value) => {
    setNotice('');
    setForm((current) => ({ ...current, [key]: value === '' ? '' : Number(value) }));
  };

  const saveReport = () => {
    const reportId = `soil-${zoneId}-${Date.now()}`;
    saveSoilReport(zoneId, {
      ...form,
      id: reportId,
      cropType: zone.cropType,
      source: form.source || 'manual_entry',
    });
    setNotice('Soil report saved. Fertigation recommendation recalculated.');
  };

  const startFertigation = ({ forceSafetyOverride = false } = {}) => {
    const reportId = `soil-${zoneId}-${Date.now()}`;
    const reportVersion = reports.length + 1;
    const report = {
      ...form,
      id: reportId,
      cropType: zone.cropType,
      source: form.source || 'manual_entry',
    };
    saveSoilReport(zoneId, report);

    const manualOverrideDose = manualDose.tankA + manualDose.tankB + manualDose.tankC;
    const manualOverrideCommand = {
      ...plan.overrideCommand,
      mode: 'manual_slider_safety_override',
      tankA: manualDose.tankA,
      tankB: manualDose.tankB,
      tankC: manualDose.tankC,
      waterDilutionMl: manualOverrideDose > 0 ? Math.max(1000, manualOverrideDose * 10) : 0,
      targetMl: manualOverrideDose > 0 ? manualOverrideDose + Math.max(1000, manualOverrideDose * 10) : 0,
      runSeconds: {
        tankA: manualDose.tankA > 0 ? Math.ceil(manualDose.tankA / Number(calibration.tankA || 1.5)) : 0,
        tankB: manualDose.tankB > 0 ? Math.ceil(manualDose.tankB / Number(calibration.tankB || 1.5)) : 0,
        tankC: manualDose.tankC > 0 ? Math.ceil(manualDose.tankC / Number(calibration.tankC || 1.5)) : 0,
      },
    };
    const commandBase = forceSafetyOverride
      ? manualOverrideDose > 0
        ? manualOverrideCommand
        : plan.overrideCommand
      : plan.command;
    const command = {
      ...commandBase,
      reportId,
      reportVersion,
      requestedAt: Date.now(),
      safetyOverride: forceSafetyOverride,
      blockedReasons: forceSafetyOverride
        ? plan.checks.filter((check) => check.level === 'block').map((check) => check.title)
        : [],
    };

    const sent = mqtt.publishFertigationDose(command);
    logFertigationEvent({
      zoneId,
      reportId,
      reportVersion,
      status: sent ? (forceSafetyOverride ? 'sent_with_safety_override' : 'sent_to_pi') : 'mqtt_offline',
      command,
      planSnapshot: plan,
    });

    setNotice(
      sent && mqtt.isConnected
        ? forceSafetyOverride
          ? 'Safety override sent to Raspberry Pi fertigation controller.'
          : 'Dose command sent to Raspberry Pi fertigation controller.'
        : sent
        ? forceSafetyOverride
          ? 'Safety override is shown locally. MQTT is offline, so no Raspberry Pi command was sent.'
          : 'Fertigation state is shown locally. MQTT is offline, so no Raspberry Pi command was sent.'
        : 'MQTT is offline. Plan saved, but hardware did not start.'
    );
  };

  const publishManualDose = (tank, ml) => {
    setManualDose(prev => ({ ...prev, [tank]: ml }));
    
    // In a real hardware system, debouncing would be ideal here.
    const command = {
      zoneId,
      mode: 'manual_override',
      [tank]: ml,
      requestedAt: Date.now()
    };
    
    mqtt.publishFertigationDose(command);
  };

  const manualDoseTotal = manualDose.tankA + manualDose.tankB + manualDose.tankC;
  const canStart = isActMode && !plan.blocked && plan.totalDoseMl > 0;
  const canSafetyOverride = isActMode && plan.blocked && (plan.overrideTotalDoseMl > 0 || manualDoseTotal > 0);
  const canPressStart = canStart || canSafetyOverride;
  const disabledReason = !isActMode
    ? 'Switch to ACT MODE to send hardware commands.'
    : plan.blocked
    ? 'Safety check is blocking fertigation. Fix the red warning first.'
    : plan.totalDoseMl <= 0
    ? 'No NPK dose is needed from the current report.'
    : '';

  return (
    <section className="mt-5 rounded-[28px] border border-[#dbe7d4] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary">
            {localize({ hi: 'फर्टिगेशन', mr: 'फर्टिगेशन', en: 'Fertigation' }, language)}
          </p>
          <h2 className="mt-1 text-xl font-black text-text-primary">
            {localize({ hi: 'NPK सलाह और कंट्रोल', mr: 'NPK सल्ला आणि कंट्रोल', en: 'NPK advisor and control' }, language)}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {zone.zoneType === 'manual'
              ? 'Manual mode: enter soil report values, review dose, then start Raspberry Pi dosing.'
              : 'Sensor mode: recommendation uses a verified active soil report and live zone readings.'}
          </p>
        </div>
        <div className="rounded-2xl bg-[#eef6ed] p-3 text-[#1a3d1a]">
          <Beaker size={22} />
        </div>
      </div>

      {notice ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-4">
        <div className="rounded-[22px] border border-[#e6eee2] bg-[#f7faf5] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-text-primary">1. Active soil report</p>
              <p className="text-xs text-text-secondary">
                {activeReport
                  ? reportIsVerified
                    ? `Verified report v${activeReport.version} for ${activeReport.farmerName} / ${activeReport.zoneId}`
                    : `Manual report v${activeReport.version}. Uploaded reports need farmer name + zone id to auto-apply.`
                  : 'No verified soil report applied yet. Upload a report with farmer name and zone id, or enter values manually.'}
              </p>
            </div>
            <select
              value={form.cropStage || 'Vegetative'}
              onChange={(event) => setForm((current) => ({ ...current, cropStage: event.target.value }))}
              className="h-11 rounded-2xl border border-border bg-white px-3 text-sm font-black text-text-primary outline-none"
            >
              {FERTIGATION_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>

          {!activeReport ? (
            <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-black">Report not linked yet</p>
              <p className="mt-1 text-xs font-semibold">
                Zone values will not change from an uploaded report unless the report has a matching farmer name and zone id.
              </p>
              <button
                type="button"
                onClick={() => navigate('/scanner')}
                className="mt-3 rounded-full bg-white px-4 py-2 text-xs font-black text-[#1a3d1a]"
              >
                Scan verified report
              </button>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <FieldInput label="N" value={form.nitrogen ?? ''} onChange={(value) => updateField('nitrogen', value)} suffix="kg/ha" />
            <FieldInput label="P" value={form.phosphorus ?? ''} onChange={(value) => updateField('phosphorus', value)} suffix="kg/ha" />
            <FieldInput label="K" value={form.potassium ?? ''} onChange={(value) => updateField('potassium', value)} suffix="kg/ha" />
            <FieldInput label="pH" value={form.ph ?? ''} onChange={(value) => updateField('ph', value)} step="0.1" />
            <FieldInput label="EC" value={form.ec ?? ''} onChange={(value) => updateField('ec', value)} step="0.1" suffix="dS/m" />
          </div>

          <button
            type="button"
            onClick={saveReport}
            className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#1a3d1a] shadow-sm"
          >
            <Save size={16} />
            Save report version
          </button>
        </div>

        <div className="rounded-[22px] border border-[#e6eee2] bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-text-primary">2. Safety check</p>
              <p className="text-xs text-text-secondary">Confidence: {plan.confidence}</p>
            </div>
            {plan.blocked ? <AlertTriangle size={20} className="text-red-600" /> : <ShieldCheck size={20} className="text-emerald-600" />}
          </div>

          {plan.checks.length ? (
            <div className="space-y-2">
              {plan.checks.map((check) => (
                <div key={check.id} className={`rounded-2xl border px-3 py-3 text-sm ${getCheckTone(check.level)}`}>
                  <p className="font-black">{check.title}</p>
                  <p className="mt-1 text-xs font-semibold opacity-80">{check.detail}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-bold text-emerald-800">
              <CheckCircle2 size={16} />
              Safe to prepare composition tank dose.
            </div>
          )}
        </div>

        <div className="rounded-[22px] border border-[#e6eee2] bg-[#f7faf5] p-4">
          <p className="mb-3 text-sm font-black text-text-primary">3. Dose and pump timing</p>
          <div className="grid gap-3">
            {plan.tankPlans.map((tank) => (
              <div key={tank.tankId} className="rounded-2xl bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-text-primary">
                      {tank.label} - {tank.solution}
                    </p>
                    <p className="text-xs text-text-secondary">
                      Current {tank.nutrient}: {tank.currentValue ?? '--'} | ideal {tank.ideal ?? '--'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-[#1a3d1a]">{tank.doseMl} ml</p>
                    <p className="text-xs font-bold text-text-secondary">{formatSeconds(tank.runSeconds)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-text-secondary">Composition tank</p>
              <p className="mt-1 text-xl font-black text-text-primary">{plan.compositionTankMl} ml</p>
              <p className="text-xs text-text-secondary">Includes {plan.waterDilutionMl} ml water dilution</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-text-secondary">Controller</p>
              <p className="mt-1 text-sm font-black text-text-primary">Raspberry Pi 4</p>
              <p className="text-xs text-text-secondary">3 relay pumps + flow meter + display</p>
            </div>
          </div>
        </div>

        {isActMode && (
          <div className="rounded-[22px] border border-emerald-200 bg-emerald-50/50 p-4">
            <p className="mb-3 text-sm font-black text-emerald-900">Manual Tank Override</p>
            <div className="space-y-4">
              {['tankA', 'tankB', 'tankC'].map((tank) => (
                <div key={tank}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-emerald-800">{tank.replace('tank', 'Tank ')}</span>
                    <span className="text-xs font-black text-emerald-900">{manualDose[tank]} ml</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="500" 
                    step="10"
                    value={manualDose[tank]}
                    onChange={(e) => publishManualDose(tank, parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
              Changes sync instantly to Raspberry Pi
            </p>
          </div>
        )}

        <div className="rounded-[22px] border border-[#e6eee2] bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-text-primary">4. Start and history</p>
              <p className="text-xs text-text-secondary">
                ACT mode required for hardware. Manual zones are allowed after report values are entered.
              </p>
            </div>
            <Clock3 size={18} className="text-[#1a3d1a]" />
          </div>

          <button
            type="button"
            onClick={() => startFertigation({ forceSafetyOverride: canSafetyOverride })}
            disabled={!canPressStart}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-sm font-black text-white ${
              canStart ? 'bg-[#1a3d1a]' : canSafetyOverride ? 'bg-amber-600' : 'cursor-not-allowed bg-slate-300'
            }`}
          >
            <Play size={16} />
            {canSafetyOverride ? 'Start with safety override' : 'Start fertigation dose'}
          </button>

          {!isActMode ? <p className="mt-2 text-xs font-bold text-text-secondary">Switch to ACT MODE to send hardware commands.</p> : null}
          {disabledReason && !canPressStart ? <p className="mt-2 text-xs font-bold text-text-secondary">{disabledReason}</p> : null}
          {canSafetyOverride ? (
            <p className="mt-2 text-xs font-bold text-amber-700">
              Override will use the calculated dose after you have checked the red safety warning.
            </p>
          ) : null}

          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-black text-text-primary">
              <History size={16} />
              Recent fertigation
            </div>
            {zoneHistory.length ? (
              <div className="space-y-2">
                {zoneHistory.map((event) => (
                  <div key={event.id} className="rounded-2xl bg-[#f7faf5] px-3 py-3 text-xs text-text-secondary">
                    <p className="font-black text-text-primary">
                      Report v{event.reportVersion || '--'} - {event.status}
                    </p>
                    <p>
                      A {event.command?.tankA || 0} ml | B {event.command?.tankB || 0} ml | C {event.command?.tankC || 0} ml
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl bg-[#f7faf5] px-3 py-3 text-xs font-bold text-text-secondary">
                No fertigation dose has been logged for this zone yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
