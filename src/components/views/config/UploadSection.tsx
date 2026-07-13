import { useConfig } from '../../../contexts/ConfigContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';

export default function UploadSection() {
  const { t } = useLanguage();
  const { config, updateConfig } = useConfig();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-center justify-between rounded-lg border border-border-subtle bg-bg-base p-3">
        <div className="space-y-0.5">
          <Label className="text-base">{t('settings.skipOwned')}</Label>
          <div className="text-sm text-text-secondary">{t('settings.skipOwnedDescription')}</div>
        </div>
        <Switch
          checked={config.advanced.skipOwned}
          onCheckedChange={(value) => updateConfig('advanced', 'skipOwned', value)}
        />
      </div>

      <div className="flex flex-row items-center justify-between rounded-lg border border-border-subtle bg-bg-base p-3">
        <div className="space-y-0.5">
          <Label className="text-base">{t('settings.preserveMetadata')}</Label>
          <div className="text-sm text-text-secondary">{t('config.preserveMetadataDesc')}</div>
        </div>
        <Switch
          checked={config.spoofing.preserveMetadata}
          onCheckedChange={(value) => updateConfig('spoofing', 'preserveMetadata', value)}
        />
      </div>

      <div className="flex flex-row items-center justify-between rounded-lg border border-border-subtle bg-bg-base p-3">
        <div className="space-y-0.5">
          <Label className="text-base">{t('settings.archiveRecovery')}</Label>
          <div className="text-sm text-text-secondary">{t('config.archiveRecoveryDesc')}</div>
        </div>
        <Switch
          checked={config.advanced.enableArchiveRecovery}
          onCheckedChange={(value) => updateConfig('advanced', 'enableArchiveRecovery', value)}
        />
      </div>
    </div>
  );
}
