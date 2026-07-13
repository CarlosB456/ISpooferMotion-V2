import { useSpooferStore } from '../../../stores/spooferStore';

export const SpoofProgressText = () => {
  const spoofProgress = useSpooferStore((s) => s.spoofProgress);
  const spoofStatusText = useSpooferStore((s) => s.spoofStatusText);
  return (
    <>
      {spoofStatusText && spoofStatusText !== 'Initializing...'
        ? `${spoofStatusText} (${Math.round(spoofProgress)}%)`
        : `Spoofing (${Math.round(spoofProgress)}%)`}
    </>
  );
};

export const SpoofProgressOverlay = () => {
  const spoofProgress = useSpooferStore((s) => s.spoofProgress);
  return (
    <div
      className="absolute left-0 top-0 bottom-0 bg-black/25 pointer-events-none"
      style={{
        width: `${spoofProgress}%`,
        transition: 'width 50ms linear',
      }}
    />
  );
};
