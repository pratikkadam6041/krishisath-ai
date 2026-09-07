export const REVIEW_QUEUE_KEY = 'ks-soil-report-review-queue';

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ');
}

function nameTokens(value) {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length >= 2 && !['mr', 'mrs', 'ms', 'shri', 'smt', 'farmer', 'kisan'].includes(token));
}

export function getReportFarmerName(reportData = {}) {
  return reportData.farmerName || reportData.userName || reportData.ownerName || '';
}

export function compareFarmerNames(reportName, appName) {
  const report = normalizeText(reportName);
  const app = normalizeText(appName);

  if (!report) {
    return { level: 'missing', score: 0, message: 'No farmer name was found on the report.' };
  }

  if (!app) {
    return { level: 'uncertain', score: 0.4, message: 'App farmer name is not set, so ownership needs confirmation.' };
  }

  if (report === app || report.includes(app) || app.includes(report)) {
    return { level: 'match', score: 1, message: 'Report farmer appears to match this account.' };
  }

  const reportTokens = nameTokens(report);
  const appTokens = nameTokens(app);
  const overlap = reportTokens.filter((token) => appTokens.includes(token));
  const score = overlap.length / Math.max(1, Math.min(reportTokens.length, appTokens.length));

  if (score >= 0.6) {
    return { level: 'close', score, message: 'Report farmer name is a close match.' };
  }

  return { level: 'mismatch', score, message: `Report farmer "${reportName}" does not match this app user "${appName}".` };
}

function numberOrNull(value) {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getSoilMetricChanges(reportData = {}, zone = {}) {
  return [
    { key: 'nitrogen', label: 'Nitrogen', unit: 'kg/ha', current: numberOrNull(zone.nitrogen), next: numberOrNull(reportData.nitrogen) },
    { key: 'phosphorus', label: 'Phosphorus', unit: 'kg/ha', current: numberOrNull(zone.phosphorus), next: numberOrNull(reportData.phosphorus) },
    { key: 'potassium', label: 'Potassium', unit: 'kg/ha', current: numberOrNull(zone.potassium), next: numberOrNull(reportData.potassium) },
    { key: 'ph', label: 'pH', unit: '', current: numberOrNull(zone.ph), next: numberOrNull(reportData.ph) },
    { key: 'ec', label: 'EC', unit: 'dS/m', current: numberOrNull(zone.ec), next: numberOrNull(reportData.electricalConductivity ?? reportData.ec) },
  ]
    .filter((item) => item.next != null)
    .map((item) => {
      const delta = item.current == null ? null : Math.round((item.next - item.current) * 10) / 10;
      const percent = item.current && item.current !== 0 ? Math.round((Math.abs(delta) / Math.abs(item.current)) * 100) : null;
      return { ...item, delta, percent };
    });
}

export function classifySoilReportDecision({ reportData = {}, zone, appUserName }) {
  if (!zone) {
    return {
      status: 'blocked',
      confidence: 'blocked',
      title: 'Select a zone first',
      message: 'Choose the field zone where this report should be reviewed.',
      reasons: ['No zone selected.'],
      changes: [],
    };
  }

  const reportName = getReportFarmerName(reportData);
  const nameMatch = compareFarmerNames(reportName, appUserName);
  const changes = getSoilMetricChanges(reportData, zone);
  const highImpactChanges = changes.filter((item) => {
    if (item.key === 'ph') return item.delta != null && Math.abs(item.delta) >= 1;
    if (item.key === 'ec') return item.next != null && item.next >= 2.5;
    return item.percent != null && item.percent >= 35;
  });

  if (nameMatch.level === 'mismatch') {
    return {
      status: 'review',
      confidence: 'low',
      title: 'Needs admin review',
      message: nameMatch.message,
      reasons: [nameMatch.message, 'The app will not change fertigation from a report that appears to belong to someone else.'],
      changes,
      highImpactChanges,
    };
  }

  if (highImpactChanges.length > 0) {
    return {
      status: 'review',
      confidence: nameMatch.level === 'match' || nameMatch.level === 'close' ? 'medium' : 'low',
      title: 'Agronomist approval required',
      message: 'This report would make a large fertigation change, so it is queued for review.',
      reasons: [
        nameMatch.message,
        'Large NPK, pH, or EC changes need agronomist/admin approval before they affect dosing.',
      ],
      changes,
      highImpactChanges,
    };
  }

  if (nameMatch.level === 'missing' || nameMatch.level === 'uncertain') {
    return {
      status: 'confirm',
      confidence: 'medium',
      title: 'Confirm ownership',
      message: 'The report can become a pending recommendation after farmer PIN confirmation.',
      reasons: [nameMatch.message, 'The selected zone is treated as farmer intent because lab reports may not print zone IDs.'],
      changes,
    };
  }

  return {
    status: 'confirm',
    confidence: 'high',
    title: 'Ready for farmer confirmation',
    message: 'This report appears to belong to this farmer. Confirm PIN before applying it to the selected zone.',
    reasons: [nameMatch.message, 'The selected zone is treated as farmer intent because lab reports may not print zone IDs.'],
    changes,
  };
}

export function queueSoilReportReview(request) {
  try {
    const existing = readSoilReportReviewQueue();
    const next = [
      {
        id: request.id || `soil-review-${Date.now()}`,
        createdAt: Date.now(),
        status: 'pending_review',
        ...request,
      },
      ...existing,
    ].slice(0, 50);
    writeSoilReportReviewQueue(next);
    return next[0];
  } catch {
    return null;
  }
}

export function readSoilReportReviewQueue() {
  try {
    return JSON.parse(window.localStorage.getItem(REVIEW_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function writeSoilReportReviewQueue(queue) {
  window.localStorage.setItem(REVIEW_QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent('soil-report-review-queue-changed', { detail: { queue } }));
}

export function updateSoilReportReview(reviewId, patch) {
  const next = readSoilReportReviewQueue().map((item) =>
    item.id === reviewId ? { ...item, ...patch, updatedAt: Date.now() } : item
  );
  writeSoilReportReviewQueue(next);
  return next;
}
