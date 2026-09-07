import { getCropWaterProfile } from '../data/cropNutrition.js';

export const FERTIGATION_STAGES = ['Sowing', 'Vegetative', 'Flowering', 'Fruiting', 'Harvest'];

const STAGE_FACTORS = {
  Sowing: 0.7,
  Vegetative: 1,
  Flowering: 1.15,
  Fruiting: 1.2,
  Harvest: 0.35,
};

export function generateLifecycleSchedule(cropType, sowingDateStr) {
  const profile = getCropWaterProfile(cropType);
  const start = new Date(sowingDateStr || Date.now());
  const schedule = [];
  let currentOffset = 0;

  const stageDurations = {
    Sowing: 14,
    Vegetative: profile.waterNeed === 'high' ? 30 : 40,
    Flowering: 21,
    Fruiting: profile.waterNeed === 'high' ? 30 : 25,
    Harvest: 14,
  };

  FERTIGATION_STAGES.forEach((stage) => {
    const stageStart = new Date(start);
    stageStart.setDate(start.getDate() + currentOffset);
    
    currentOffset += stageDurations[stage];
    const stageEnd = new Date(start);
    stageEnd.setDate(start.getDate() + currentOffset);

    schedule.push({
      stage,
      startDate: stageStart.toISOString(),
      endDate: stageEnd.toISOString(),
      factor: STAGE_FACTORS[stage],
      idealN: profile.nitrogen?.ideal,
      idealP: profile.phosphorus?.ideal,
      idealK: profile.potassium?.ideal,
    });
  });

  return schedule;
}

const TANKS = {
  tankA: { nutrient: 'N', field: 'nitrogen', label: 'Tank A', solution: 'Nitrogen' },
  tankB: { nutrient: 'P', field: 'phosphorus', label: 'Tank B', solution: 'Phosphorus' },
  tankC: { nutrient: 'K', field: 'potassium', label: 'Tank C', solution: 'Potassium' },
};

function numberOrNull(value) {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getDeficiencyDose(value, range, stageFactor) {
  if (value == null || !range || value >= range.min) {
    return { doseMl: 0, severity: 'good', deficit: 0 };
  }

  const deficit = Math.max(0, range.ideal - value);
  const rangeWidth = Math.max(1, range.ideal - range.min);
  const ratio = deficit / rangeWidth;

  const baseDose = ratio >= 1.25 ? 120 : ratio >= 0.65 ? 80 : 40;

  return {
    doseMl: Math.round(baseDose * stageFactor),
    severity: ratio >= 1.25 ? 'severe' : ratio >= 0.65 ? 'medium' : 'small',
    deficit: Math.round(deficit * 10) / 10,
  };
}

function getConfidence(report) {
  if (report.source === 'soil_report_scan' && report.ec != null && report.ph != null) return 'high';
  if (report.nitrogen != null && report.ph != null) return 'medium';
  return 'low';
}

export function buildReportFromZone(zone, fallback = {}) {
  return {
    id: fallback.id || null,
    version: fallback.version || 0,
    zoneId: zone?.id,
    cropType: fallback.cropType || zone?.cropType || 'wheat',
    cropStage: fallback.cropStage || zone?.cropStage || 'Vegetative',
    nitrogen: numberOrNull(fallback.nitrogen ?? zone?.nitrogen),
    phosphorus: numberOrNull(fallback.phosphorus ?? zone?.phosphorus),
    potassium: numberOrNull(fallback.potassium ?? zone?.potassium),
    ph: numberOrNull(fallback.ph ?? zone?.ph),
    ec: numberOrNull(fallback.ec ?? zone?.ec),
    organicCarbon: numberOrNull(fallback.organicCarbon),
    source: fallback.source || (zone?.zoneType === 'manual' ? 'manual_entry' : 'sensor_snapshot'),
    createdAt: fallback.createdAt || Date.now(),
  };
}

export function createFertigationPlan({
  zone,
  report,
  tankLevels = {},
  calibration = {},
  lastEvent,
}) {
  const activeReport = buildReportFromZone(zone, report || {});
  const cropProfile = getCropWaterProfile(activeReport.cropType);
  const stageFactor = STAGE_FACTORS[activeReport.cropStage] ?? 1;
  const checks = [];

  const ph = activeReport.ph;
  const ec = activeReport.ec;
  const moisture = numberOrNull(zone?.moisture);

  if (ph != null && ph < 5.5) {
    checks.push({
      id: 'ph_low',
      level: 'block',
      title: 'pH too acidic',
      detail: `pH ${ph} is unsafe for NPK fertigation. Correct pH before dosing.`,
    });
  } else if (ph != null && ph > 8.2) {
    checks.push({
      id: 'ph_high',
      level: 'block',
      title: 'pH too alkaline',
      detail: `pH ${ph} is unsafe for NPK fertigation. Correct pH before dosing.`,
    });
  } else if (ph == null) {
    checks.push({
      id: 'ph_missing',
      level: 'warning',
      title: 'pH missing',
      detail: 'Enter pH from the soil report for a safer recommendation.',
    });
  }

  if (ec != null && ec > 2.5) {
    checks.push({
      id: 'ec_high',
      level: 'block',
      title: 'EC too high',
      detail: `EC ${ec} indicates salt risk. Flush or irrigate before fertigation.`,
    });
  } else if (ec == null) {
    checks.push({
      id: 'ec_missing',
      level: 'warning',
      title: 'EC missing',
      detail: 'EC is recommended before running fertilizer through the composition tank.',
    });
  }

  if (moisture != null && moisture < 30) {
    checks.push({
      id: 'moisture_low',
      level: 'block',
      title: 'Soil too dry',
      detail: 'Irrigate first, then run fertigation after moisture stabilizes.',
    });
  }

  if (lastEvent?.createdAt && Date.now() - lastEvent.createdAt < 18 * 60 * 60 * 1000) {
    checks.push({
      id: 'recent_fertigation',
      level: 'warning',
      title: 'Recent fertigation',
      detail: 'This zone was fertigated recently. Confirm before repeating.',
    });
  }

  const tankPlans = Object.entries(TANKS).map(([tankId, tank]) => {
    const range = cropProfile[tank.nutrient];
    const value = activeReport[tank.field];
    const dose = getDeficiencyDose(value, range, stageFactor);
    const level = Number(tankLevels[tankId] ?? 0);
    const mlPerSecond = Number(calibration[tankId] ?? 1.5);
    const runSeconds = dose.doseMl > 0 && mlPerSecond > 0 ? Math.ceil(dose.doseMl / mlPerSecond) : 0;

    if (dose.doseMl > 0 && level < 12) {
      checks.push({
        id: `${tankId}_low`,
        level: 'block',
        title: `${tank.label} low`,
        detail: `${tank.solution} tank is at ${level}%. Refill before dosing.`,
      });
    }

    return {
      tankId,
      ...tank,
      currentValue: value,
      ideal: range?.ideal,
      min: range?.min,
      max: range?.max,
      doseMl: dose.doseMl,
      deficit: dose.deficit,
      severity: dose.severity,
      runSeconds,
      mlPerSecond,
    };
  });

  const blocked = checks.some((check) => check.level === 'block');
  const effectiveTankPlans = blocked
    ? tankPlans.map((plan) => ({ ...plan, doseMl: 0, runSeconds: 0 }))
    : tankPlans;
  const overrideTotalDoseMl = tankPlans.reduce((sum, plan) => sum + plan.doseMl, 0);
  const overrideWaterDilutionMl = overrideTotalDoseMl > 0 ? Math.max(1000, overrideTotalDoseMl * 10) : 0;
  const totalDoseMl = effectiveTankPlans.reduce((sum, plan) => sum + plan.doseMl, 0);
  const waterDilutionMl = totalDoseMl > 0 ? Math.max(1000, totalDoseMl * 10) : 0;

  return {
    report: activeReport,
    cropProfile,
    cropStage: activeReport.cropStage,
    confidence: getConfidence(activeReport),
    checks,
    blocked,
    tankPlans: effectiveTankPlans,
    overrideTankPlans: tankPlans,
    overrideTotalDoseMl,
    overrideCompositionTankMl: overrideTotalDoseMl + overrideWaterDilutionMl,
    overrideWaterDilutionMl,
    totalDoseMl,
    compositionTankMl: totalDoseMl + waterDilutionMl,
    waterDilutionMl,
    command: {
      zoneId: zone?.id,
      reportId: activeReport.id,
      reportVersion: activeReport.version,
      mode: zone?.zoneType === 'manual' ? 'manual_report_based' : 'sensor_report_based',
      tankA: effectiveTankPlans.find((plan) => plan.tankId === 'tankA')?.doseMl || 0,
      tankB: effectiveTankPlans.find((plan) => plan.tankId === 'tankB')?.doseMl || 0,
      tankC: effectiveTankPlans.find((plan) => plan.tankId === 'tankC')?.doseMl || 0,
      waterDilutionMl,
      targetMl: totalDoseMl + waterDilutionMl,
      runSeconds: Object.fromEntries(effectiveTankPlans.map((plan) => [plan.tankId, plan.runSeconds])),
    },
    overrideCommand: {
      zoneId: zone?.id,
      reportId: activeReport.id,
      reportVersion: activeReport.version,
      mode: zone?.zoneType === 'manual' ? 'manual_safety_override' : 'sensor_safety_override',
      tankA: tankPlans.find((plan) => plan.tankId === 'tankA')?.doseMl || 0,
      tankB: tankPlans.find((plan) => plan.tankId === 'tankB')?.doseMl || 0,
      tankC: tankPlans.find((plan) => plan.tankId === 'tankC')?.doseMl || 0,
      waterDilutionMl: overrideWaterDilutionMl,
      targetMl: overrideTotalDoseMl + overrideWaterDilutionMl,
      runSeconds: Object.fromEntries(tankPlans.map((plan) => [plan.tankId, plan.runSeconds])),
    },
  };
}
