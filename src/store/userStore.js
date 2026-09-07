import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const SUBSCRIPTION_TIERS = {
  BASIC: 'Basic',
  PRO: 'Pro',
  ENTERPRISE: 'Enterprise',
};

// Mock admin data - in a real app this would be in Firebase
// Connected to Vite Local Backend API for cross-browser sync
export const useUserStore = create(
  persist(
    (set, get) => ({
      users: {}, // phone -> UserObject
      
      registerUser: (phone, firstName) => {
        const users = get().users;
        if (users[phone]) return users[phone];
        
        const newUser = {
          id: `FARMER_${Date.now()}`,
          phone,
          firstName: firstName || 'Kisan',
          status: 'PENDING',
          tier: SUBSCRIPTION_TIERS.BASIC,
          registeredAt: Date.now(),
          features: {
            marketPrices: true,
            soilReports: false,
            fertigation: false,
            mlPredictions: false,
          }
        };
        
        const newUsers = { ...users, [phone]: newUser };
        set({ users: newUsers });
        fetch('/api/db', { method: 'POST', body: JSON.stringify({ users: newUsers }) });
        return newUser;
      },

      updateUserStatus: (phone, status) => {
        const users = get().users;
        if (!users[phone]) return;
        const newUsers = { ...users, [phone]: { ...users[phone], status } };
        set({ users: newUsers });
        fetch('/api/db', { method: 'POST', body: JSON.stringify({ users: newUsers }) });
      },

      updateUserTier: (phone, tier) => {
        const users = get().users;
        if (!users[phone]) return;
        
        const features = { ...users[phone].features };
        if (tier === SUBSCRIPTION_TIERS.PRO) {
          features.soilReports = true;
          features.fertigation = true;
        } else if (tier === SUBSCRIPTION_TIERS.ENTERPRISE) {
          features.soilReports = true;
          features.fertigation = true;
          features.mlPredictions = true;
        }
        
        const newUsers = { ...users, [phone]: { ...users[phone], tier, features } };
        set({ users: newUsers });
        fetch('/api/db', { method: 'POST', body: JSON.stringify({ users: newUsers }) });
      },

      toggleUserFeature: (phone, featureKey, value) => {
        const users = get().users;
        if (!users[phone]) return;
        
        const newUsers = {
          ...users,
          [phone]: {
            ...users[phone],
            features: { ...users[phone].features, [featureKey]: value }
          }
        };
        set({ users: newUsers });
        fetch('/api/db', { method: 'POST', body: JSON.stringify({ users: newUsers }) });
      },

      getUser: (phone) => get().users[phone],
      
      getAllPendingUsers: () => Object.values(get().users).filter(u => u.status === 'PENDING'),
      getAllApprovedUsers: () => Object.values(get().users).filter(u => u.status === 'APPROVED'),
      
      syncWithServer: async () => {
        try {
          const res = await fetch('/api/db');
          const data = await res.json();
          if (data && data.users) {
            set((state) => ({ users: { ...state.users, ...data.users } }));
          }
        } catch (err) {
          console.error('API sync failed', err);
        }
      }
    }),
    {
      name: 'ks-users-storage',
      onRehydrateStorage: () => (state, error) => {
        if (!error) {
          // Asynchronously fetch from central DB after local storage loads
          setTimeout(() => {
            useUserStore.getState().syncWithServer();
          }, 100);
        }
      }
    }
  )
);
