import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { WifiOff } from 'lucide-react';

import BottomNav from './components/BottomNav/index.jsx';
import ChatBot from './components/ChatBot.jsx';
import VoiceAssistantFab from './components/VoiceAssistantFab.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

import AuthFlowScreen, { SplashScreen } from './screens/AuthFlowScreen.jsx';
import OnboardingScreen from './screens/OnboardingScreen.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import DigitalTwinScreen from './screens/DigitalTwinScreen.jsx';
import ScannerScreen from './screens/ScannerScreen.jsx';
import ScanReportScreen from './screens/ScanReportScreen.jsx';
import ChatScreen from './screens/ChatScreen.jsx';
import MandiScreen from './screens/MandiScreen.jsx';
import SchemesScreen from './screens/SchemesScreen.jsx';
import SchemeDetailScreen from './screens/SchemeDetailScreen.jsx';
import SettingsScreen from './screens/SettingsScreen.jsx';
import HardwareSetupScreen from './screens/HardwareSetupScreen.jsx';
import NotificationScreen from './screens/NotificationScreen.jsx';
import NotificationDetailScreen from './screens/NotificationDetailScreen.jsx';
import WeatherScreen from './screens/WeatherScreen.jsx';
import ZoneDetailScreen from './screens/ZoneDetailScreen.jsx';
import AnimalProtectionScreen from './screens/AnimalProtectionScreen.jsx';
import GeoFarmScreen from './screens/GeoFarmScreen.jsx';
import SolarScreen from './screens/SolarScreen.jsx';
import AdminLoginScreen from './screens/AdminLoginScreen.jsx';
import AdminDashboard from './screens/AdminDashboard.jsx';
import AdminFarmerList from './screens/AdminFarmerList.jsx';
import AdminQRScanner from './screens/AdminQRScanner.jsx';
import AdminQueries from './screens/AdminQueries.jsx';
import FarmerProfileScreen from './screens/FarmerProfileScreen.jsx';
import CustomerSupportScreen from './screens/CustomerSupportScreen.jsx';
import FeedbackScreen from './screens/FeedbackScreen.jsx';
import MaintenanceScreen from './screens/MaintenanceScreen.jsx';

import { useSettingsStore } from './store/settingsStore.js';
import { useAuthStore } from './store/authStore.js';
import { useZoneStore } from './store/zoneStore.js';
import { useModeStore } from './store/modeStore.js';
import { useAdminStore } from './store/adminStore.js';
import { syncNotificationsFromZones } from './utils/zoneSync.js';
import { useMqtt } from './hooks/useMqtt.js';
import { localize } from './utils/formatters.js';
import { isFeatureRouteEnabled } from './utils/featureFlags.js';
import { applyDemoMode } from './utils/devBootstrap.js';
import { useMandiStore } from './store/mandiStore.js';

import { getDueZoneSchedules } from './services/irrigationScheduler.js';
import { requestPushPermission } from './services/notificationEngine.js';
import { cacheZoneSnapshot, getCachedZoneSnapshot } from './services/offlineCache.js';

function hasDevBootstrapRequest() {
  if (!import.meta.env.DEV) return false;
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname;
  return Boolean(params.get('demo') || path.startsWith('/__qa/manual') || path.startsWith('/__qa/sensor'));
}

function AppShell() {
  const location = useLocation();
  const mqtt = useMqtt();
  const language = useSettingsStore((state) => state.language);
  const displayMode = useSettingsStore((state) => state.displayMode);
  const zones = useZoneStore((state) => state.zones);
  const queuedCommands = useZoneStore((state) => state.queuedCommands);
  const clearQueuedCommands = useZoneStore((state) => state.clearQueuedCommands);
  const mode = useModeStore((state) => state.mode);
  const features = useAdminStore((state) => state.features);

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const previousModeRef = useRef(mode);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOffline || queuedCommands.length === 0 || !mqtt.isConnected) {
      return;
    }

    queuedCommands.forEach((command) => {
      if (command.type === 'pump') {
        mqtt.publishPump(command.zoneId, command.action, 'queued');
      }
    });

    clearQueuedCommands();
  }, [clearQueuedCommands, isOffline, mqtt, queuedCommands]);

  useEffect(() => {
    if (previousModeRef.current === mode) {
      return;
    }

    previousModeRef.current = mode;
    mqtt.publishSystemMode(mode);

    if (mode !== 'view') {
      return;
    }

    Object.values(useZoneStore.getState().zones || {}).forEach((zone) => {
      if (!zone?.id || zone.zoneType === 'manual') {
        return;
      }

      const isIrrigating = zone.pumpOn || zone.valveOpen || zone.fertigationOn;
      if (!isIrrigating) {
        return;
      }

      mqtt.publishPump(zone.id, false, 'mode-view');
      mqtt.publishValve(zone.id, false, 'mode-view');
      mqtt.publishFertigation(zone.id, false, 'mode-view');
    });
  }, [mode, mqtt]);

  useEffect(() => {
    cacheZoneSnapshot(zones);
  }, [zones]);

  useEffect(() => {
    if (isOffline) {
      const cached = getCachedZoneSnapshot();
      if (cached) {
        useZoneStore.setState({ zones: { ...useZoneStore.getState().zones, ...cached } });
      }
    }
  }, [isOffline]);

  useEffect(() => {
    const tick = () => {
      syncNotificationsFromZones(useZoneStore.getState().zones);
      if (mode !== 'act' || !mqtt.isConnected) return;
      
      const zones = useZoneStore.getState().zones;
      
      // Auto-turn OFF pumps whose duration has expired
      Object.values(zones || {}).forEach((zone) => {
        if (zone.pumpOn && zone.pumpOffTime && Date.now() >= zone.pumpOffTime) {
          mqtt.publishPump(zone.id, false, 'schedule-end');
          useZoneStore.getState().updateZoneField(zone.id, 'pumpOffTime', null);
        }
      });

      // Turn ON scheduled pumps
      getDueZoneSchedules(zones).forEach((zone) => {
        mqtt.publishPump(zone.id, true, 'schedule');
        const durationMin = zone.scheduleDuration || 30;
        useZoneStore.getState().updateZoneField(zone.id, 'pumpOffTime', Date.now() + durationMin * 60000);
      });
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [mode, mqtt]);

  const isAdminRoute = location.pathname.startsWith('/admin-portal');
  const isTwinRoute = location.pathname.includes('/twin');
  const isDesktopMode = displayMode === 'desktop';
  const frameWidth = isDesktopMode
    ? 'sm:max-w-[1440px] sm:h-[92dvh] sm:max-h-none'
    : 'max-w-[28rem]';

  return (
    <div
      className={`mx-auto flex h-[100dvh] w-full flex-col overflow-hidden shadow-[0_0_0_1px_rgba(15,23,42,0.05),0_30px_90px_rgba(15,23,42,0.12)] sm:my-auto sm:h-[90dvh] sm:max-h-[850px] sm:rounded-[36px] dark:shadow-none ${
        isAdminRoute ? 'max-w-none sm:h-screen sm:max-h-none sm:rounded-none bg-slate-950' : frameWidth
      } ${
        isTwinRoute ? 'relative bg-[#0a0f12]' : 'bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),rgba(240,246,238,0.96)_28%,rgba(233,242,230,1)_100%)] dark:bg-slate-950 dark:bg-none'
      } ${isDesktopMode ? 'desktop-workspace' : ''}`}
    >
      {isOffline ? (
        <div className="flex items-center justify-center gap-2 border-b border-amber-200 bg-[#fff7d6] px-4 py-2 text-center text-sm font-bold text-[#8a5b00]">
          <WifiOff size={14} />
          {localize(
            {
              hi: 'पुराना डेटा दिख रहा है। नेटवर्क आते ही नया डेटा और पंप कमांड सिंक होंगे।',
              mr: 'जुना डेटा दिसत आहे. नेटवर्क मिळताच नवीन डेटा आणि पंप कमांड सिंक होतील.',
              en: 'Showing cached data. Fresh data and queued pump actions will sync once the network returns.',
            },
            language
          )}
        </div>
      ) : null}

      <div
        className={
          isTwinRoute
            ? 'relative min-h-0 flex-1 overflow-hidden'
            : isAdminRoute
            ? 'relative min-h-0 flex-1 overflow-y-auto'
            : 'relative min-h-0 flex-1 overflow-y-auto pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))]'
        }
      >
        <ErrorBoundary key={location.pathname}>
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/__qa/sensor" element={<HomeScreen />} />
            <Route path="/__qa/manual" element={<HomeScreen />} />
            <Route path="/twin" element={isFeatureRouteEnabled('/twin', features) ? <DigitalTwinScreen /> : <Navigate to="/" replace />} />
            <Route path="/__qa/sensor/twin" element={isFeatureRouteEnabled('/twin', features) ? <DigitalTwinScreen /> : <Navigate to="/" replace />} />
            <Route path="/scanner" element={isFeatureRouteEnabled('/scanner', features) ? <ScannerScreen /> : <Navigate to="/" replace />} />
            <Route path="/__qa/sensor/scanner" element={isFeatureRouteEnabled('/scanner', features) ? <ScannerScreen /> : <Navigate to="/" replace />} />
            <Route path="/scanner/report/:id" element={isFeatureRouteEnabled('/scanner', features) ? <ScanReportScreen /> : <Navigate to="/" replace />} />
            <Route path="/chat" element={<ChatScreen />} />
            <Route path="/__qa/sensor/chat" element={<ChatScreen />} />
            <Route path="/mandi" element={isFeatureRouteEnabled('/mandi', features) ? <MandiScreen /> : <Navigate to="/" replace />} />
            <Route path="/__qa/sensor/mandi" element={isFeatureRouteEnabled('/mandi', features) ? <MandiScreen /> : <Navigate to="/" replace />} />
            <Route path="/weather" element={<WeatherScreen />} />
            <Route path="/__qa/sensor/weather" element={<WeatherScreen />} />
            <Route path="/animal-protection" element={<AnimalProtectionScreen />} />
            <Route path="/geofarm" element={<GeoFarmScreen />} />
            <Route path="/solar-intelligence" element={<SolarScreen />} />
            <Route path="/schemes" element={<SchemesScreen />} />
            <Route path="/__qa/sensor/schemes" element={<SchemesScreen />} />
            <Route path="/schemes/:id" element={<SchemeDetailScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/__qa/sensor/settings" element={<SettingsScreen />} />
            <Route path="/hardware" element={<HardwareSetupScreen />} />
            <Route path="/__qa/sensor/hardware" element={<HardwareSetupScreen />} />
            <Route path="/notifications" element={<NotificationScreen />} />
            <Route path="/__qa/sensor/notifications" element={<NotificationScreen />} />
            <Route path="/notifications/:id" element={<NotificationDetailScreen />} />
            <Route path="/zone/:id" element={<ZoneDetailScreen />} />
            <Route path="/__qa/sensor/zone/:id" element={<ZoneDetailScreen />} />
            <Route path="/__qa/manual/zone/:id" element={<ZoneDetailScreen />} />
            <Route path="/admin-portal" element={<AdminLoginScreen />} />
            <Route path="/admin-portal/dashboard" element={<AdminDashboard />} />
            <Route path="/admin-portal/farmers" element={<AdminFarmerList />} />
            <Route path="/admin-portal/scanner" element={<AdminQRScanner />} />
            <Route path="/admin-portal/queries" element={<AdminQueries />} />
            <Route path="/profile" element={<FarmerProfileScreen />} />
            <Route path="/support" element={<CustomerSupportScreen />} />
            <Route path="/feedback" element={<FeedbackScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </div>

      {!isAdminRoute && <BottomNav immersive={isTwinRoute} />}
      {location.pathname !== '/chat' && !isTwinRoute && !isAdminRoute ? (
        <>
          <VoiceAssistantFab />
          <ChatBot />
        </>
      ) : null}
    </div>
  );
}

function AppGate() {
  const language = useSettingsStore((state) => state.language);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const phoneNumber = useAuthStore((state) => state.phoneNumber);
  const pinCredential = useAuthStore((state) => state.pinCredential);
  const onboardingStatus = useAuthStore((state) => state.onboardingStatus);

  const [showSplash, setShowSplash] = useState(true);
  const [demoReady, setDemoReady] = useState(() => !hasDevBootstrapRequest());
  const maintenanceMode = useAdminStore((state) => state.maintenanceMode);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const demoMode = params.get('demo');
    const demoLanguage = params.get('lang') || 'hi';
    const path = window.location.pathname;
    const qaMode = path.startsWith('/__qa/manual') ? 'manual' : path.startsWith('/__qa/sensor') ? 'sensor' : '';

    if (!demoMode && !qaMode) return;

    applyDemoMode(demoMode || qaMode, demoLanguage);
    queueMicrotask(() => setDemoReady(true));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 2000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (showSplash || onboardingStatus === 'pending') return;
    const zones = useZoneStore.getState().zones;
    syncNotificationsFromZones(zones);
    useMandiStore.getState().hydrateFromCache?.();
    useMandiStore.getState().refreshPrices?.().catch(() => {});
    requestPushPermission();
  }, [onboardingStatus, showSplash]);

  if (!demoReady) {
    return null;
  }

  if (showSplash) {
    return <SplashScreen language={language || 'hi'} />;
  }

  // Admin routes bypass farmer auth — they have their own login
  if (window.location.pathname.startsWith('/admin-portal')) {
    return <AppShell />;
  }

  // System maintenance gate
  if (maintenanceMode) {
    return <MaintenanceScreen />;
  }

  // If the state is corrupted (authenticated but no phone number), force logout
  if (isAuthenticated && !phoneNumber) {
    useAuthStore.getState().logout();
    return null; // Will re-render on next tick
  }

  if (!language || !phoneNumber || !pinCredential || !isAuthenticated) {
    return <AuthFlowScreen />;
  }
  if (onboardingStatus === 'pending') {
    return <OnboardingScreen />;
  }

  return <AppShell />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin portal — accessible without user auth */}
        <Route path="/admin-portal" element={<AdminLoginScreen />} />
        <Route path="/admin-portal/dashboard" element={<AdminDashboard />} />
        <Route path="/admin-portal/farmers" element={<AdminFarmerList />} />
        <Route path="/admin-portal/scanner" element={<AdminQRScanner />} />
        <Route path="/admin-portal/queries" element={<AdminQueries />} />
        {/* All other routes go through the auth gate */}
        <Route path="*" element={<AppGate />} />
      </Routes>
    </BrowserRouter>
  );
}
