import { Copy, ListChecks, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useShallow } from 'zustand/react/shallow';

import { useLanguage } from '../../../contexts/LanguageContext';
import { useSpooferStore } from '../../../stores/spooferStore';
import { cn } from '../../../utils/cn';

interface ExecutionLogsProps {
  logs: string[];
  setLogs: (logs: string[]) => void;
  lastReplacements: Record<string, string>;
  setResultsModalOpen: (open: boolean) => void;
}

export default function ExecutionLogs({
  logs,
  setLogs,
  lastReplacements,
  setResultsModalOpen,
}: ExecutionLogsProps) {
  const { t } = useLanguage();
  const outputRef = useRef<HTMLDivElement>(null);

  const { spoofCurrentCount, spoofTotalCount, spoofStartTime, isSpoofing } = useSpooferStore(
    useShallow((s) => ({
      spoofCurrentCount: s.spoofCurrentCount,
      spoofTotalCount: s.spoofTotalCount,
      spoofStartTime: s.spoofStartTime,
      isSpoofing: s.isSpoofing,
    })),
  );

  const [eta, setEta] = useState<string | null>(null);

  useEffect(() => {
    if (!isSpoofing || !spoofStartTime || spoofCurrentCount === 0 || spoofTotalCount === 0) {
      setEta(null);
      return;
    }

    const interval = setInterval(() => {
      const elapsedMs = Date.now() - spoofStartTime;
      const msPerItem = elapsedMs / spoofCurrentCount;
      const remainingItems = spoofTotalCount - spoofCurrentCount;

      if (remainingItems <= 0) {
        setEta(null);
        return;
      }

      const remainingMs = msPerItem * remainingItems;
      const remainingSec = Math.floor(remainingMs / 1000);

      if (remainingSec < 60) {
        setEta(`~${remainingSec}s remaining`);
      } else {
        const mins = Math.floor(remainingSec / 60);
        const secs = remainingSec % 60;
        setEta(`~${mins}m ${secs}s remaining`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isSpoofing, spoofStartTime, spoofCurrentCount, spoofTotalCount]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col gap-2 h-full min-h-0">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-sm font-semibold text-text-primary flex items-center gap-2">
          {t('spoof.output')}
          {isSpoofing && spoofTotalCount > 0 && (
            <span className="text-xs font-medium text-text-secondary opacity-80">
              ({spoofCurrentCount}/{spoofTotalCount}
              {eta ? ` - ${eta}` : ''})
            </span>
          )}
        </span>
        <div className="flex items-center gap-3">
          {Object.keys(lastReplacements).length > 0 && (
            <button
              onClick={() => setResultsModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              <ListChecks size={14} /> {t('spoof.viewResults')}
            </button>
          )}
          {logs && logs.length > 0 && (
            <>
              <button
                onClick={() => void navigator.clipboard.writeText(logs.join(''))}
                className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-primary transition-colors"
              >
                <Copy size={14} /> Copy Logs
              </button>
              <button
                onClick={() => setLogs([])}
                className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-danger transition-colors"
              >
                <Trash2 size={14} /> {t('spoof.clearLogs')}
              </button>
            </>
          )}
        </div>
      </div>
      <div
        ref={outputRef}
        className="w-full flex-1 min-h-30 rounded-md border border-border-strong bg-bg-surface p-3 font-mono text-[13px] font-medium text-text-primary shadow-inner overflow-y-auto whitespace-pre-wrap wrap-break-word"
      >
        {logs && logs.length > 0 ? (
          <div className="flex flex-col gap-1">
            {logs.map((line, idx) => {
              if (!line) return null;
              const isSuccess = line.includes('[SUCCESS]');
              const isWarn = line.includes('[WARN]');
              const isError = line.includes('[ERROR]');

              const containerClass = cn(
                'py-1.5 px-3 rounded border border-transparent',
                isError
                  ? 'text-danger bg-danger/5 border-danger/10'
                  : isWarn
                    ? 'text-warning bg-warning/5 border-warning/10'
                    : isSuccess
                      ? 'text-success bg-success/5 border-success/10'
                      : 'text-text-primary',
              );

              return (
                <div key={idx} className={containerClass}>
                  {line}
                </div>
              );
            })}
          </div>
        ) : (
          <span className="opacity-50">{t('spoof.outputPlaceholder')}</span>
        )}
      </div>
    </div>
  );
}
