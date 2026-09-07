import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ROI constants (per pump-second ON vs flood irrigation baseline)
const ROI_RATES = {
  waterLitresPerSec: 0.0125,       // litres saved per second
  electricKwhPerSec: 0.0000097,    // kWh saved per second
  fertGramsPerSec: 0.0019,         // grams fertilizer saved per second
  moneyPerSec: 0.00203,            // ₹ saved per second
  electricRatePerKwh: 8,           // ₹ per kWh
  waterRatePerLitre: 0.05,         // ₹ per litre (approx)
  fertRatePerGram: 0.08,           // ₹ per gram (approx)
};

export const useRoiStore = create(
  persist(
    (set, get) => ({
      totalSeconds: 0,
      todaySeconds: 0,
      weekSeconds: 0,
      lastResetDate: new Date().toDateString(),
      lastWeekReset: getWeekKey(),
      weeklySummary: null,

      // Called when pump turns ON — start accumulating
      pumpTick: (deltaSeconds = 1) => {
        const now = new Date();
        const todayStr = now.toDateString();
        const weekStr = getWeekKey();
        const state = get();

        let todaySeconds = state.todaySeconds;
        let weekSeconds = state.weekSeconds;

        // Daily reset
        if (state.lastResetDate !== todayStr) {
          todaySeconds = 0;
        }
        // Weekly reset (Sunday midnight)
        if (state.lastWeekReset !== weekStr) {
          // Generate summary before reset
          const summary = get().computeSummary(weekSeconds);
          set({ weeklySummary: summary, lastWeekReset: weekStr, weekSeconds: 0 });
          weekSeconds = 0;
        }

        set({
          totalSeconds: state.totalSeconds + deltaSeconds,
          todaySeconds: todaySeconds + deltaSeconds,
          weekSeconds: weekSeconds + deltaSeconds,
          lastResetDate: todayStr,
        });
      },

      computeSummary: (seconds) => {
        const s = seconds ?? get().weekSeconds;
        return {
          waterLitres: +(s * ROI_RATES.waterLitresPerSec).toFixed(1),
          waterMoney: +(s * ROI_RATES.waterLitresPerSec * ROI_RATES.waterRatePerLitre).toFixed(2),
          electricKwh: +(s * ROI_RATES.electricKwhPerSec).toFixed(3),
          electricMoney: +(s * ROI_RATES.electricKwhPerSec * ROI_RATES.electricRatePerKwh).toFixed(2),
          fertGrams: +(s * ROI_RATES.fertGramsPerSec).toFixed(1),
          fertMoney: +(s * ROI_RATES.fertGramsPerSec * ROI_RATES.fertRatePerGram).toFixed(2),
          totalMoney: +(s * ROI_RATES.moneyPerSec).toFixed(2),
          seconds: s,
        };
      },

      getSavings: (period = 'today') => {
        const s = period === 'today' ? get().todaySeconds
                 : period === 'week'  ? get().weekSeconds
                 : get().totalSeconds;
        return get().computeSummary(s);
      },
    }),
    { name: 'ks-roi-store' }
  )
);

function getWeekKey() {
  const now = new Date();
  const year = now.getFullYear();
  const week = Math.ceil(((now - new Date(year, 0, 1)) / 86400000 + 1) / 7);
  return `${year}-W${week}`;
}
