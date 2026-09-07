import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const now = Date.now();

const DEMO_NOTIFICATIONS = [
  {
    id: 'notif-1',
    type: 'moisture',
    title: 'Zone 1 की नमी 42% है',
    subtitle: 'North Field को शाम तक सिंचाई देना बेहतर रहेगा।',
    body: 'सेंसर रीडिंग पिछले 2 मिनट पहले अपडेट हुई है। हवा तेज है, इसलिए हल्की सिंचाई अभी करना फायदेमंद रहेगा।',
    timestamp: now - 10 * 60 * 1000,
    read: false,
    actionRoute: '/zone/z1',
  },
  {
    id: 'notif-2',
    type: 'pest',
    title: 'कपास क्षेत्र में सफेद मक्खी का खतरा',
    subtitle: 'आपके जिले में अगले 3 दिनों तक निगरानी रखें।',
    body: 'सुबह खेत का निरीक्षण करें। पत्तियों के नीचे सफेद मक्खी दिखे तो नीम-आधारित स्प्रे की तैयारी रखें।',
    timestamp: now - 3 * 60 * 60 * 1000,
    read: false,
    actionRoute: '/scanner',
  },
  {
    id: 'notif-3',
    type: 'scheme',
    title: 'PM Kisan की अगली किस्त जल्द',
    subtitle: 'किस्त आने से पहले eKYC पूरा रखें।',
    body: 'यदि eKYC लंबित है तो CSC केंद्र या आधिकारिक पोर्टल पर जाकर प्रक्रिया पूरी करें।',
    timestamp: now - 28 * 60 * 60 * 1000,
    read: true,
    actionRoute: '/schemes/pm-kisan',
  },
  {
    id: 'notif-4',
    type: 'mandi',
    title: 'टमाटर का भाव ₹45 बढ़ा',
    subtitle: 'Pune APMC में आज तेजी दर्ज हुई है।',
    body: 'यदि आप कल या परसों बिक्री की योजना बना रहे हैं तो आज का भाव नोट कर लें और पास की मंडियों से तुलना करें।',
    timestamp: now - 4 * 24 * 60 * 60 * 1000,
    read: true,
    actionRoute: '/mandi',
  },
];

export const useNotificationStore = create(
  persist(
    (set, get) => ({
      notifications: DEMO_NOTIFICATIONS,

      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            {
              id: `notif-${Date.now()}`,
              timestamp: Date.now(),
              read: false,
              ...notification,
            },
            ...state.notifications,
          ].slice(0, 80),
        })),

      dismiss: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((item) => item.id !== id),
        })),

      markRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((item) =>
            item.id === id ? { ...item, read: true } : item
          ),
        })),

      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((item) => ({ ...item, read: true })),
        })),

      getUnreadCount: () => get().notifications.filter((item) => !item.read).length,
      getNotification: (id) => get().notifications.find((item) => item.id === id),
    }),
    { name: 'ks-notification-store' }
  )
);
