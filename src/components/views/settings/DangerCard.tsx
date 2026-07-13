import { ask } from '@tauri-apps/plugin-dialog';
import { AlertTriangle } from 'lucide-react';

import { useConfig } from '../../../contexts/ConfigContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

export default function DangerCard() {
  const { t } = useLanguage();
  const { resetConfig } = useConfig();

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2 text-destructive">
          <AlertTriangle size={18} className="text-destructive" />
          {t('settings.dangerZone')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="pt-2">
          <Button
            variant="destructive"
            className="w-full h-10 font-bold text-sm shadow-sm"
            onClick={async () => {
              const confirmed = await ask(t('settings.confirmResetDesc'), {
                title: t('settings.confirmResetTitle'),
                kind: 'warning',
              });
              if (confirmed) {
                resetConfig();
                window.ismLog?.('success', t('settings.resetSuccess'));
              }
            }}
          >
            {t('settings.resetAllSettings')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
