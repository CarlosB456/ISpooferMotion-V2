import { useConfig } from '../../../contexts/ConfigContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';

export default function RoutingSection() {
  const { t } = useLanguage();
  const { config, updateConfig } = useConfig();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>{t('settings.proxyUrl')}</Label>
        <Input
          placeholder={t('settings.proxyUrlPlaceholder')}
          value={config.advanced.proxyUrl}
          onChange={(e) => updateConfig('advanced', 'proxyUrl', e.target.value)}
        />
      </div>

      <div className="flex flex-row items-center justify-between rounded-lg border border-border-subtle bg-bg-base p-3">
        <div className="space-y-0.5">
          <Label className="text-base">{t('settings.concurrentSpoofing')}</Label>
          <div className="text-sm text-text-secondary">
            {t('settings.concurrentSpoofingDescription')}
          </div>
        </div>
        <Switch
          checked={config.advanced.concurrentSpoofing}
          onCheckedChange={(value) => updateConfig('advanced', 'concurrentSpoofing', value)}
        />
      </div>

      {config.advanced.concurrentSpoofing && (
        <div className="flex flex-col gap-1.5">
          <Label>{t('settings.maxConcurrency')}</Label>
          <Input
            type="number"
            value={config.advanced.maxConcurrency.toString()}
            onChange={(e) =>
              updateConfig('advanced', 'maxConcurrency', parseInt(e.target.value, 10) || 100)
            }
          />
        </div>
      )}
    </div>
  );
}
