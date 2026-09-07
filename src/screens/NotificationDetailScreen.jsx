import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useSettingsStore } from '../store/settingsStore.js';
import { useNotificationStore } from '../store/notificationStore.js';
import { useAdminStore } from '../store/adminStore.js';
import { NOTIFICATION_TYPE_META } from '../data/appContent.js';
import { formatRelativeTime, localize } from '../utils/formatters.js';
import { safeFeatureRoute } from '../utils/featureFlags.js';

export default function NotificationDetailScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const language = useSettingsStore((state) => state.language);
  const notifications = useNotificationStore((state) => state.notifications);
  const features = useAdminStore((state) => state.features);
  const notification = useMemo(() => notifications.find((item) => item.id === id), [id, notifications]);

  if (!notification) {
    return null;
  }

  const meta = NOTIFICATION_TYPE_META[notification.type] || NOTIFICATION_TYPE_META.sensor;

  return (
    <div className="min-h-[100dvh] bg-[#f4f9f2] px-4 pt-4 pb-8">
      <div className="mb-4 flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-text-primary">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-text-primary">{notification.title}</h1>
          <p className="text-sm text-text-secondary">{formatRelativeTime(notification.timestamp, language)}</p>
        </div>
      </div>

      <div className="rounded-[28px] border border-border bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] border ${meta.tone}`}>
          <span className="text-3xl">{meta.icon}</span>
        </div>
        <p className="text-sm text-text-secondary">{notification.subtitle}</p>
        <p className="mt-4 text-base text-text-primary">{notification.body}</p>
        <button
          type="button"
          onClick={() => navigate(safeFeatureRoute(notification.actionRoute || '/notifications', features))}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1a3d1a] px-4 py-4 text-sm font-black text-white"
        >
          {localize({ hi: 'संबंधित स्क्रीन खोलें', mr: 'संबंधित स्क्रीन उघडा', en: 'Open related screen' }, language)}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
