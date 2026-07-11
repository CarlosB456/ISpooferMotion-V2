import { Button } from '@codycon/ism-library';
import { motion } from 'framer-motion';
import { Ban, Play, RotateCcw, ScanSearch } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { commands } from '../../../types/bindings';
import { useLanguage } from '../../../contexts/LanguageContext';

export interface SpoofingControlsProps {
  failedAssetIds: string[];
  activeSpooferJobId: string | null;
  isSpoofing: boolean;
  isReplacing: boolean;
  isScanningStudio: boolean;
  isJobPaused: boolean;
  replaceError: boolean;
  itemVariants: import('framer-motion').Variants;
  handleRetryFailedAssets: () => void;
  handleCancelSpoofer: () => void;
  handleScanStudio: () => void;
  setIsJobPaused: (val: boolean) => void;
  handleRetryReplacement: () => void;
  handleRunSpoofer: () => void;
  SpoofProgressText: React.FC;
  SpoofProgressOverlay: React.FC;
}

export function SpoofingControls({
  failedAssetIds,
  activeSpooferJobId,
  isSpoofing,
  isReplacing,
  isScanningStudio,
  isJobPaused,
  replaceError,
  itemVariants,
  handleRetryFailedAssets,
  handleCancelSpoofer,
  handleScanStudio,
  setIsJobPaused,
  handleRetryReplacement,
  handleRunSpoofer,
  SpoofProgressText,
  SpoofProgressOverlay,
}: SpoofingControlsProps) {
  const { t } = useLanguage();

  return (
    <motion.div
      variants={itemVariants}
      className="shrink-0 flex flex-wrap items-center justify-end gap-3 pt-4 mt-auto border-t border-border-subtle"
    >
      {failedAssetIds.length > 0 && !activeSpooferJobId && (
        <Button
          variant="flat"
          color="warning"
          className="h-12 px-6 font-semibold grow md:grow-0"
          startContent={<RotateCcw size={18} />}
          onClick={() => void handleRetryFailedAssets()}
          disabled={isSpoofing || isReplacing || isScanningStudio}
        >
          {t('spoof.retryFailed').replace('{count}', failedAssetIds.length.toString())} (
          {failedAssetIds.length})
        </Button>
      )}

      <Button
        variant="flat"
        color={activeSpooferJobId ? 'danger' : 'default'}
        className={cn('h-12 px-8 font-semibold transition-all duration-300 grow md:grow-0')}
        startContent={activeSpooferJobId ? <Ban size={18} /> : <ScanSearch size={18} />}
        onClick={() => {
          if (activeSpooferJobId) {
            void handleCancelSpoofer();
          } else {
            void handleScanStudio();
          }
        }}
        disabled={(!activeSpooferJobId && (isSpoofing || isReplacing)) || isScanningStudio}
      >
        {activeSpooferJobId
          ? t('common.cancel')
          : isScanningStudio
            ? t('spoof.scanning')
            : t('spoof.scanStudio')}
      </Button>

      {activeSpooferJobId && (
        <Button
          variant="flat"
          color="secondary"
          className="h-12 px-8 font-semibold grow md:grow-0"
          startContent={isJobPaused ? <Play size={18} /> : <Ban size={18} className="rotate-90" />}
          onClick={async () => {
            if (isJobPaused) {
              await commands.spooferResume(activeSpooferJobId);
              setIsJobPaused(false);
            } else {
              await commands.spooferPause(activeSpooferJobId);
              setIsJobPaused(true);
            }
          }}
        >
          {isJobPaused ? t('spoof.resume') : t('spoof.pause')}
        </Button>
      )}

      <Button
        color={replaceError ? 'warning' : 'primary'}
        className="h-12 px-10 font-bold tracking-wide overflow-hidden relative min-w-50 grow md:grow-0"
        onClick={() => {
          if (replaceError) {
            void handleRetryReplacement();
          } else {
            void handleRunSpoofer();
          }
        }}
        disabled={isSpoofing || isReplacing || isScanningStudio}
      >
        <div className="relative z-10 flex items-center justify-center gap-2 w-full h-full">
          {!isSpoofing && !isReplacing && !replaceError && <Play size={18} fill="currentColor" />}
          <span>
            {isReplacing ? (
              t('spoof.replacingInStudio')
            ) : replaceError ? (
              t('spoof.retryReplacing')
            ) : isSpoofing ? (
              <SpoofProgressText />
            ) : (
              t('spoof.runSpoofer')
            )}
          </span>
        </div>
        {(isSpoofing || isReplacing) && <SpoofProgressOverlay />}
      </Button>
    </motion.div>
  );
}
