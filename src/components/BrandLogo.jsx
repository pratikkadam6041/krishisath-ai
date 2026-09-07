import logoSrc from '../assets/krishisarth-symbol.svg';

export default function BrandLogo({
  size = 72,
  className = '',
  imageClassName = '',
  rounded = 'rounded-[24px]',
  shadow = true,
}) {
  return (
    <div className={className}>
      <img
        src={logoSrc}
        alt="KrishiSarth company symbol"
        width={size}
        height={size}
        className={`${rounded} object-contain bg-transparent ${shadow ? 'shadow-[0_18px_40px_rgba(15,23,42,0.16)]' : ''} ${imageClassName}`}
      />
    </div>
  );
}
