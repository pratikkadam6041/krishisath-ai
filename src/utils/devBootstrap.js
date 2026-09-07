import { useAuthStore } from '../store/authStore.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { useZoneStore } from '../store/zoneStore.js';

function baseAuthState(firstName) {
  return {
    phoneNumber: '9876543210',
    pendingPhoneNumber: '',
    pendingOtp: '',
    otpSentAt: null,
    pinCredential: '1234',
    fingerprintEnabled: true,
    isAuthenticated: true,
    onboardingStatus: 'complete',
    firstName,
  };
}

export function applyDemoMode(mode = 'sensor', language = 'hi') {
  const safeMode = mode === 'manual' ? 'manual' : 'sensor';
  const firstName = safeMode === 'manual' ? 'Suman' : 'Ramesh';

  useSettingsStore.getState().setLanguage(language);
  useSettingsStore.setState({
    ownerName: firstName,
    farmName: safeMode === 'manual' ? 'Lakshmi Plot' : 'Green Valley Farm',
    village: safeMode === 'manual' ? 'Baramati' : 'Pimpri',
    district: 'Pune',
    state: 'Maharashtra',
    totalAcres: safeMode === 'manual' ? 3.2 : 4.3,
    units: 'acre',
  });

  useAuthStore.setState(baseAuthState(firstName));

  useZoneStore.getState().setUserProfile({
    userName: firstName,
    farmName: safeMode === 'manual' ? 'Lakshmi Plot' : 'Green Valley Farm',
    village: safeMode === 'manual' ? 'Baramati' : 'Pimpri',
    district: 'Pune',
    state: 'Maharashtra',
    totalAcres: safeMode === 'manual' ? 3.2 : 4.3,
    crops: safeMode === 'manual' ? ['wheat', 'onion'] : ['wheat', 'tomato'],
    isManualMode: safeMode === 'manual',
  });

  useZoneStore.getState().configureZonesForMode({
    isManualMode: safeMode === 'manual',
    crops: safeMode === 'manual' ? ['wheat', 'onion'] : ['wheat', 'tomato'],
  });

  if (safeMode === 'manual') {
    useZoneStore.getState().setManualEntry('manual1', {
      cropStage: 'Tillering',
      observation: 'Moist',
      notes: 'Surface looks healthy after last irrigation.',
    });
  }
}
