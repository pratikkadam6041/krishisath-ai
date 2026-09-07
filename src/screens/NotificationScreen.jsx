import { Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../store/settingsStore.js';
import { useNotificationStore } from '../store/notificationStore.js';
import { useAdminStore } from '../store/adminStore.js';
import { NOTIFICATION_TYPE_META } from '../data/appContent.js';
import { formatRelativeTime, groupByDateLabel, localize } from '../utils/formatters.js';
import { isFeatureRouteEnabled } from '../utils/featureFlags.js';

export default function NotificationScreen() {
  const navigate = useNavigate();
  const language = useSettingsStore((state) => state.language);
  const notifications = useNotificationStore((state) => state.notifications);
  const features = useAdminStore((state) => state.features);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const markRead = useNotificationStore((state) => state.markRead);
  const dismiss = useNotificationStore((state) => state.dismiss);

  const visibleNotifications = notifications.filter((notification) =>
    isFeatureRouteEnabled(notification.actionRoute || '', features)
  );
  const groups = groupByDateLabel(visibleNotifications, language);

  return (
    <div className="bg-[#f4f9f2] px-4 pt-4 pb-8 min-h-full">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black text-text-primary">
          {localize({ hi: 'सूचनाएं', mr: 'सूचना', en: 'Notifications' }, language)}
        </h1>
        {visibleNotifications.some((n) => !n.read) && (
          <button type="button" onClick={() => markAllRead()} className="text-sm font-black text-[#1a3d1a]">
            {localize({ hi: 'सभी पढ़ें', mr: 'सर्व वाचा', en: 'Mark all read' }, language)}
          </button>
        )}
      </div>

      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.key}>
            <h2 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-text-secondary">{group.label}</h2>
            <div className="space-y-3">
              {group.items.map((notification) => {
                const meta = NOTIFICATION_TYPE_META[notification.type] || NOTIFICATION_TYPE_META.sensor;
                return (
                  <div key={notification.id} className={`rounded-[24px] border p-4 shadow-[0_18px_50px_rgba(15,23,42,0.05)] ${notification.read ? 'bg-white border-border' : 'bg-[#f0faf0] border-[#d4e7d2]'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${meta.tone}`}>
                        <span className="text-xl">{meta.icon}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          markRead(notification.id);
                          navigate(`/notifications/${notification.id}`);
                        }}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-text-primary">{notification.title}</p>
                          {!notification.read && <span className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />}
                        </div>
                        <p className="mt-1 text-sm text-text-secondary">{notification.subtitle}</p>
                        <p className="mt-2 text-xs font-semibold text-slate-500">{formatRelativeTime(notification.timestamp, language)}</p>
                      </button>
                      <button type="button" onClick={() => dismiss(notification.id)} className="rounded-full border border-border p-2 text-text-secondary">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
