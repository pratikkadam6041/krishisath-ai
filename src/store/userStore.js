import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useActivityLogStore } from './activityLogStore.js';

export const SUBSCRIPTION_TIERS = {
  BASIC: 'Basic',
  PRO: 'Pro',
  ENTERPRISE: 'Enterprise',
};

function postLocalDb(payload) {
  if (typeof fetch !== 'function') return;
  fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

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
        useActivityLogStore.getState().logActivity({
          type: 'registration',
          farmerPhone: phone,
          farmerName: newUser.firstName,
          title: 'New farmer registered',
          detail: `Phone ${phone} created a Basic account and is awaiting admin approval.`,
        });
        postLocalDb({ users: newUsers });
        return newUser;
      },

      updateUserStatus: (phone, status) => {
        const users = get().users;
        if (!users[phone]) return;
        const newUsers = { ...users, [phone]: { ...users[phone], status } };
        set({ users: newUsers });
        postLocalDb({ users: newUsers });
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
        postLocalDb({ users: newUsers });
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
        postLocalDb({ users: newUsers });
      },

      getUser: (phone) => get().users[phone],
      
      getAllPendingUsers: () => Object.values(get().users).filter(u => u.status === 'PENDING'),
      getAllApprovedUsers: () => Object.values(get().users).filter(u => u.status === 'APPROVED'),
      
      syncWithServer: async () => {
        try {
          const res = await fetch('/api/db');
          const data = await res.json();
          if (data && data.users) {
            const mergedUsers = { ...get().users, ...data.users };
            set({ users: mergedUsers });
            postLocalDb({ users: mergedUsers });
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
