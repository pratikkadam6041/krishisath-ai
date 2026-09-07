export default function WeatherGlyph({
  condition = '',
  rainProb = 0,
  size = 32,
  className = '',
}) {
  const label = condition.toLowerCase();
  const isStorm = label.includes('storm') || label.includes('thunder');
  const isRain = label.includes('rain') || rainProb >= 45;
  const isCloudy = label.includes('cloud') || label.includes('overcast');
  const isFoggy = label.includes('fog') || label.includes('mist');
  const isWindy = label.includes('wind');
  const isPartly = label.includes('partly');
  const showSun = !isStorm && !isRain && (!isCloudy || isPartly || !label);
  const showCloud = isCloudy || isRain || isStorm || isPartly || isFoggy;

  return (
    <div
      className={`weather-scene ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <div className="weather-scene__glow" />

      {showSun ? (
        <div className={`weather-scene__sun ${isPartly ? 'weather-scene__sun--offset' : ''}`}>
          <span className="weather-scene__sun-core" />
          <span className="weather-scene__sun-ring" />
        </div>
      ) : null}

      {showCloud ? (
        <>
          <div className="weather-scene__cloud weather-scene__cloud--front">
            <span />
            <span />
            <span />
          </div>
          <div className="weather-scene__cloud weather-scene__cloud--back">
            <span />
            <span />
            <span />
          </div>
        </>
      ) : null}

      {isRain ? (
        <div className="weather-scene__rain">
          {Array.from({ length: 4 }).map((_, index) => (
            <span key={`rain-${index}`} style={{ animationDelay: `${index * 0.22}s` }} />
          ))}
        </div>
      ) : null}

      {isStorm ? (
        <div className="weather-scene__storm">
          <span className="weather-scene__bolt" />
        </div>
      ) : null}

      {isFoggy ? (
        <div className="weather-scene__mist">
          <span />
          <span />
        </div>
      ) : null}

      {isWindy ? (
        <div className="weather-scene__wind">
          <span />
          <span />
        </div>
      ) : null}
    </div>
  );
}
