import { useTranslation } from 'react-i18next';
import { useRoiStore } from '../../store/roiStore.js';
import { TrendingUp, Share2 } from 'lucide-react';

export default function RoiCard({ period = 'today' }) {
  const { t } = useTranslation();
  const getSavings = useRoiStore((s) => s.getSavings);
  const savings = getSavings(period);

  const periodKey = { today: 'roi.today', week: 'roi.week', total: 'roi.total' }[period] || 'roi.today';

  const handleShare = () => {
    const text = `KrishiSarth AI ने आज ₹${savings.totalMoney} वाचवले!\nपाणी: ${savings.waterLitres} लिटर\nवीज: ₹${savings.electricMoney}\nखत: ₹${savings.fertMoney}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="card p-4 bg-gradient-to-br from-primary to-primary-dark text-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} className="text-primary-light" />
          <span className="font-semibold text-sm opacity-90">{t(periodKey)}</span>
        </div>
        <button
          id="roi-share-btn"
          onClick={handleShare}
          className="flex items-center gap-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg px-2 py-1 touch-target"
          style={{ minHeight: 36 }}
          aria-label={t('roi.share')}
        >
          <Share2 size={14} />
          <span className="text-xs">{t('roi.share')}</span>
        </button>
      </div>

      <div className="roi-count">
        <p className="text-3xl font-bold">₹{savings.totalMoney.toFixed(0)}</p>
        <p className="text-sm opacity-80 mt-0.5">{t('roi.comparedTo')}</p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { label: t('roi.waterSaved', { amount: savings.waterMoney.toFixed(0) }), val: `${savings.waterLitres}L` },
          { label: t('roi.electricSaved', { amount: savings.electricMoney.toFixed(0) }), val: `${savings.electricKwh.toFixed(2)}kWh` },
          { label: t('roi.fertilizerSaved', { amount: savings.fertMoney.toFixed(0) }), val: `${savings.fertGrams.toFixed(0)}g` },
        ].map((item, i) => (
          <div key={i} className="bg-white bg-opacity-15 rounded-lg p-2 text-center">
            <p className="text-xs opacity-80 leading-tight">{item.label}</p>
            <p className="font-bold text-sm mt-0.5">{item.val}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
