/**
 * queryStore.js — Farmer ↔ Admin query synchronization
 *
 * TODO: REPLACE WITH REAL API (Firebase Firestore / REST) BEFORE PRODUCTION.
 * Currently uses localStorage which only works on the SAME device.
 * In production, farmer submits to Firestore, admin reads from Firestore in real-time.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// No seed data — queries come from real farmer submissions
const INITIAL_QUERIES = [];

export const useQueryStore = create(
  persist(
    (set, get) => ({
      queries: INITIAL_QUERIES,

      // Farmer submits a new query
      submitQuery: ({ farmerId, farmerName, farmerPhone, subject, message, priority = 'Medium' }) => {
        const newQuery = {
          id: `Q-${Date.now()}`,
          farmerId: farmerId || 'KS-UNK-USR-000',
          farmerName: farmerName || 'Unknown Farmer',
          farmerPhone: farmerPhone || '',
          subject,
          message,
          status: 'Open',
          priority,
          createdAt: Date.now(),
          replies: [],
        };
        set((state) => ({ queries: [newQuery, ...state.queries] }));
        return newQuery.id;
      },

      // Admin sends a reply
      adminReply: (queryId, replyText) => {
        set((state) => ({
          queries: state.queries.map((q) =>
            q.id === queryId
              ? {
                  ...q,
                  replies: [...q.replies, { text: replyText, isAdmin: true, createdAt: Date.now() }],
                  status: q.status === 'Open' ? 'In Progress' : q.status,
                }
              : q
          ),
        }));
      },

      // Admin marks a query resolved
      markResolved: (queryId) => {
        set((state) => ({
          queries: state.queries.map((q) =>
            q.id === queryId ? { ...q, status: 'Resolved' } : q
          ),
        }));
      },

      // Get unread/open count for a specific farmer
      getFarmerQueries: (farmerId) => {
        return get().queries.filter((q) => q.farmerId === farmerId);
      },

      // Count for admin badge
      getOpenCount: () => {
        return get().queries.filter((q) => q.status === 'Open').length;
      },
    }),
    {
      // v2 key — clears old fake query seed data
      name: 'ks-query-store-v2',
    }
  )
);

// Cross-tab synchronization
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'ks-query-store-v2') {
      useQueryStore.persist.rehydrate();
    }
  });
}
