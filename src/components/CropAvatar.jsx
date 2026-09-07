import {
  Apple,
  Flower2,
  Grape,
  Leaf,
  Sprout,
  Wheat,
} from 'lucide-react';

const CROP_STYLES = {
  wheat: { icon: Wheat, bg: 'bg-amber-100', fg: 'text-amber-700', ring: 'ring-amber-200/80' },
  rice: { icon: Wheat, bg: 'bg-lime-100', fg: 'text-lime-700', ring: 'ring-lime-200/80' },
  maize: { icon: Wheat, bg: 'bg-yellow-100', fg: 'text-yellow-700', ring: 'ring-yellow-200/80' },
  sugarcane: { icon: Sprout, bg: 'bg-emerald-100', fg: 'text-emerald-700', ring: 'ring-emerald-200/80' },
  cotton: { icon: Flower2, bg: 'bg-stone-100', fg: 'text-stone-700', ring: 'ring-stone-200/80' },
  soybean: { icon: Leaf, bg: 'bg-green-100', fg: 'text-green-700', ring: 'ring-green-200/80' },
  onion: { icon: Leaf, bg: 'bg-fuchsia-100', fg: 'text-fuchsia-700', ring: 'ring-fuchsia-200/80' },
  tomato: { icon: Apple, bg: 'bg-rose-100', fg: 'text-rose-700', ring: 'ring-rose-200/80' },
  grapes: { icon: Grape, bg: 'bg-violet-100', fg: 'text-violet-700', ring: 'ring-violet-200/80' },
  pomegranate: { icon: Apple, bg: 'bg-orange-100', fg: 'text-orange-700', ring: 'ring-orange-200/80' },
  other: { icon: Sprout, bg: 'bg-slate-100', fg: 'text-slate-700', ring: 'ring-slate-200/80' },
};

export default function CropAvatar({ cropId = 'other', size = 'md', className = '' }) {
  const style = CROP_STYLES[cropId] || CROP_STYLES.other;
  const Icon = style.icon;
  const sizes = {
    sm: 'h-9 w-9',
    md: 'h-11 w-11',
    lg: 'h-14 w-14',
  };
  const iconSizes = {
    sm: 16,
    md: 18,
    lg: 24,
  };

  return (
    <span
      className={`inline-flex ${sizes[size]} items-center justify-center rounded-2xl ring-1 ${style.bg} ${style.fg} ${style.ring} ${className}`}
      aria-hidden="true"
    >
      <Icon size={iconSizes[size]} strokeWidth={2.2} />
    </span>
  );
}
