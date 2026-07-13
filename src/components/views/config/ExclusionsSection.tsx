import { useConfig } from '../../../contexts/ConfigContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';

export default function ExclusionsSection() {
  const { t } = useLanguage();
  const { config, updateConfig } = useConfig();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>{t('settings.excludedUsers')}</Label>
        <Input
          placeholder={t('settings.excludedUsersPlaceholder')}
          value={config.advanced.excludedUserIds}
          onChange={(e) => updateConfig('advanced', 'excludedUserIds', e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{t('settings.excludedGroups')}</Label>
        <Input
          placeholder={t('settings.excludedGroupsPlaceholder')}
          value={config.advanced.excludedGroupIds}
          onChange={(e) => updateConfig('advanced', 'excludedGroupIds', e.target.value)}
        />
      </div>
    </div>
  );
}
