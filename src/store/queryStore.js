/**
 * queryStore.js — Farmer ↔ Admin query synchronization
 *
 * Local hackathon mode:
 * localStorage keeps each browser profile fast, while /api/db shares the same data
 * between different Chrome profiles on this laptop.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useActivityLogStore } from './activityLogStore.js';

// No seed data — queries come from real farmer submissions
const INITIAL_QUERIES = [];

function postLocalDb(payload) {
  if (typeof fetch !== 'function') return;
  fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

function mergeQueries(current = [], incoming = []) {
  const records = new Map();
  [...current, ...incoming].forEach((query) => {
    if (!query?.id) return;
    records.set(query.id, query);
  });
  return Array.from(records.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

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
        const nextQueries = [newQuery, ...(get().queries || [])];
        set({ queries: nextQueries });
        postLocalDb({ queries: nextQueries });
        useActivityLogStore.getState().logActivity({
          type: 'query',
          farmerPhone,
          farmerName,
          title: 'New farmer query',
          detail: subject,
          metadata: { queryId: newQuery.id, priority },
        });
        return newQuery.id;
      },

      // Admin sends a reply
      adminReply: (queryId, replyText) => {
        const nextQueries = (get().queries || []).map((q) =>
          q.id === queryId
            ? {
                ...q,
                replies: [...(q.replies || []), { text: replyText, isAdmin: true, createdAt: Date.now() }],
                status: q.status === 'Open' ? 'In Progress' : q.status,
              }
            : q
        );
        set({ queries: nextQueries });
        postLocalDb({ queries: nextQueries });
      },

      // Admin marks a query resolved
      markResolved: (queryId) => {
        const nextQueries = (get().queries || []).map((q) =>
          q.id === queryId ? { ...q, status: 'Resolved' } : q
        );
        set({ queries: nextQueries });
        postLocalDb({ queries: nextQueries });
      },

      // Get unread/open count for a specific farmer
      getFarmerQueries: (farmerId) => {
        return get().queries.filter((q) => q.farmerId === farmerId);
      },

      // Count for admin badge
      getOpenCount: () => {
        return get().queries.filter((q) => q.status === 'Open').length;
      },

      syncWithServer: async () => {
        try {
          const res = await fetch('/api/db');
          const data = await res.json();
          if (Array.isArray(data?.queries)) {
            const mergedQueries = mergeQueries(get().queries, data.queries);
            set({ queries: mergedQueries });
            postLocalDb({ queries: mergedQueries });
          }
        } catch {
          // Local backend is only available while running the dev server.
        }
      },
    }),
    {
      // v2 key — clears old fake query seed data
      name: 'ks-query-store-v2',
      version: 2,
      onRehydrateStorage: () => (state, error) => {
        if (!error) {
          setTimeout(() => useQueryStore.getState().syncWithServer(), 100);
        }
      },
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
