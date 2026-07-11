import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { isTauriRuntime } from '../../utils/tauriRuntime';

export default function WatermarkEngine() {
  const [version, setVersion] = useState<string>('Unknown');
  const [riskLevel, setRiskLevel] = useState<'low' | 'high'>('low');
  const [instantCapture, setInstantCapture] = useState(false);

  useEffect(() => {
    if (!isTauriRuntime()) {
      setVersion('DEV');
      return;
    }

    invoke<string>('get_app_version')
      .then(setVersion)
      .catch(() => setVersion('Unknown'));

    let timeoutId: ReturnType<typeof setTimeout>;

    const unlistenInstant = listen('capture-instant', () => {
      setInstantCapture(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setInstantCapture(false);
      }, 1000); // Keep visible for 1 second to outlast the screenshot freeze
    });

    const unlistenHigh = listen('capture-risk-high', () => setRiskLevel('high'));
    const unlistenLow = listen('capture-risk-low', () => setRiskLevel('low'));

    return () => {
      clearTimeout(timeoutId);
      unlistenInstant.then((f) => f());
      unlistenHigh.then((f) => f());
      unlistenLow.then((f) => f());
    };
  }, []);

  // Base opacity is 0. If they hit a screenshot key OR open OBS, it spikes.
  const opacity = riskLevel === 'high' || instantCapture ? 0.6 : 0;

  // Cut the transition duration to 0 to make the fade-in instant, beating the DWM freeze
  const transitionDuration = opacity > 0 ? 0 : 0.5;
  const watermarkText = `ISpooferMotion v${version}`;

  // Use a data URI SVG as a repeating background pattern for high-performance tiling
  // We encode the string to safely inject it into the SVG XML
  const svgPattern = `data:image/svg+xml,%3Csvg width='400' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Cg transform='rotate(-25, 200, 150)'%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='18' font-weight='800' fill='rgba(255,255,255,1)' text-anchor='middle' dominant-baseline='middle' style='text-shadow: 2px 2px 4px rgba(0,0,0,0.8);'%3E${encodeURIComponent(watermarkText)}%3C/text%3E%3C/g%3E%3C/svg%3E`;

  return (
    <motion.div
      initial={false}
      animate={{ opacity }}
      transition={{ duration: transitionDuration, ease: 'easeOut' }}
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 999999 }}
    >
      <div
        className="absolute w-[200%] h-[200%] -left-1/2 -top-1/2"
        style={{
          backgroundImage: `url("${svgPattern}")`,
          backgroundRepeat: 'repeat',
          backgroundPosition: 'center',
        }}
      />
    </motion.div>
  );
}
