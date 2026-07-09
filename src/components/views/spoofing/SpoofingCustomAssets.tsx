import { FormTextarea } from '@codycon/ism-library';
import { ScanSearch } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useConfig } from '../../../contexts/ConfigContext';

export function SpoofingCustomAssets() {
  const { t } = useLanguage();
  const { config, updateConfig } = useConfig();

  return (
    <div className="flex flex-col gap-2 p-4 bg-bg-surface border border-border-subtle rounded-xl shadow-sm flex-1">
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <ScanSearch size={16} className="text-primary" />
        <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
          {t('spoof.additionalIdsToSpoof')}
        </span>
      </div>
      <FormTextarea
        value={config.spoofing.extraAssetIds}
        onChange={(val: string) => updateConfig('spoofing', 'extraAssetIds', val)}
        placeholder={t('spoof.additionalIdsPlaceholder')}
        className="flex-1 w-full min-h-16 text-sm"
        style={{ resize: 'none' }}
      />
    </div>
  );
}

