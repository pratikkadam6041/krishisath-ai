import { useEffect, useState } from 'react';

export function useCountUp(endValue, duration = 1500) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // If endValue isn't a number (e.g. "—" or ""), just return it
    const numValue = parseFloat(endValue);
    if (isNaN(numValue)) {
      setCount(endValue);
      return;
    }

    let startTimestamp = null;
    let animationFrameId = null;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // easeOutQuart easing function
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      const currentVal = (numValue * easeProgress);

      // Keep decimals if the original had decimals, else round
      if (endValue.toString().includes('.')) {
        setCount(parseFloat(currentVal.toFixed(1)));
      } else {
        setCount(Math.round(currentVal));
      }

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        setCount(endValue);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
    };
  }, [endValue, duration]);

  return count;
}
