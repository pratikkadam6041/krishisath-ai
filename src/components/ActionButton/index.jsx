export default function ActionButton({
  id, icon, label, variant = 'primary', onClick, disabled = false, fullWidth = false, size = 'md',
}) {
  const base = 'touch-target flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 select-none';
  const sizes = { sm: 'px-3 py-2 text-sm', md: 'px-4 py-3 text-sm', lg: 'px-5 py-3.5 text-base' };
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-dark active:scale-95 shadow-sm',
    danger:  'bg-danger text-white hover:opacity-90 active:scale-95 shadow-sm',
    ghost:   'bg-bg text-text-secondary hover:bg-border border border-border active:scale-95',
    outline: 'border-2 border-primary text-primary hover:bg-primary hover:text-white active:scale-95',
    amber:   'bg-accent-amber text-gray-900 hover:opacity-90 active:scale-95 shadow-sm',
  };

  return (
    <button
      id={id}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      }`}
      style={{ minHeight: 52 }}
      aria-label={label}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {label && <span>{label}</span>}
    </button>
  );
}
