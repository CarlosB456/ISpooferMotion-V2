import {
  Button,
  FormInput,
  FormToggle,
  Group,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  MultiSelectDropdown,
} from '@codycon/ism-library';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { motion } from 'framer-motion';
import { FolderSearch, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

import AnimationIcon from '../../../assets/roblox_icons/Animation.png';
import DecalIcon from '../../../assets/roblox_icons/Decal.png';
import MeshIcon from '../../../assets/roblox_icons/MeshPart.png';
import ScriptIcon from '../../../assets/roblox_icons/Script.png';
import SoundIcon from '../../../assets/roblox_icons/Sound.png';
import { useConfig } from '../../../contexts/ConfigContext';
import { useLanguage } from '../../../contexts/LanguageContext';

export default function UploadSection() {
  const { t } = useLanguage();
  const { config, updateConfig } = useConfig();
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const uploadOptions = [
    {
      value: 'animation',
      assetType: 'animation',
      label: t('explorer.animations'),
      icon: AnimationIcon,
    },
    {
      value: 'audio',
      assetType: 'audio',
      label: t('explorer.audio'),
      icon: SoundIcon,
    },
    {
      value: 'image',
      assetType: 'image',
      label: t('explorer.images'),
      icon: DecalIcon,
    },
    {
      value: 'mesh',
      assetType: 'mesh',
      label: t('explorer.meshes'),
      icon: MeshIcon,
    },
    {
      value: 'script_ref',
      assetType: 'script_ref',
      label: t('explorer.scriptRefs'),
      icon: ScriptIcon,
    },
  ];

  const handleBrowseFolder = async () => {
    const selected = await openDialog({ multiple: false, directory: true });
    if (selected && typeof selected === 'string') {
      updateConfig('spoofing', 'downloadPath', selected);
    }
  };

  return (
    <>
      <Group>
        <FormToggle
          label={t('settings.advanced')}
          description=""
          checked={showAdvanced}
          onChange={setShowAdvanced}
        />

        <motion.div
          initial={false}
          animate={{
            height: showAdvanced ? 'auto' : 0,
            opacity: showAdvanced ? 1 : 0,
          }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="overflow-hidden flex flex-col"
          aria-hidden={!showAdvanced}
        >
          <div className="pt-4 flex flex-col gap-2">
            <FormToggle
              label={t('settings.skipOwned')}
              description={t('settings.skipOwnedDescription')}
              checked={config.advanced.skipOwned}
              onChange={(value: boolean) => updateConfig('advanced', 'skipOwned', value)}
            />

            <FormToggle
              label={t('settings.preserveMetadata')}
              description={t('config.preserveMetadataDesc')}
              checked={config.spoofing.preserveMetadata}
              onChange={(value: boolean) => updateConfig('spoofing', 'preserveMetadata', value)}
            />

            <FormToggle
              label={t('settings.archiveRecovery')}
              description={t('config.archiveRecoveryDesc')}
              checked={config.advanced.enableArchiveRecovery}
              onChange={(value: boolean) =>
                updateConfig('advanced', 'enableArchiveRecovery', value)
              }
            />
          </div>
        </motion.div>

        <div className="flex flex-col gap-1.5 pt-2">
          <span className="text-[13px] font-semibold text-text-primary px-1">
            {t('config.uploadConfiguration')}
          </span>
          <span className="text-xs text-text-muted px-1 mb-2">
            {t('config.uploadConfigurationDesc')}
          </span>
          <MultiSelectDropdown
            options={uploadOptions}
            values={config.spoofing.uploadTypes.filter((type: string) => type !== 'video')}
            onChange={(values: string[]) => {
              const hasVideo = config.spoofing.uploadTypes.includes('video');
              const newValues = hasVideo ? [...values, 'video'] : values;
              updateConfig('spoofing', 'uploadTypes', newValues);
            }}
            placeholder={t('settings.uploadTypesPlaceholder')}
          />

          <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
            <FormToggle
              label={
                <span className="text-danger font-semibold flex items-center gap-2">
                  {t('config.enableVideoUploads')}
                </span>
              }
              description={t('config.enableVideoUploadsDesc')}
              checked={config.spoofing.uploadTypes.includes('video')}
              onChange={(checked: boolean) => {
                if (checked) {
                  setIsVideoModalOpen(true);
                } else {
                  updateConfig(
                    'spoofing',
                    'uploadTypes',
                    config.spoofing.uploadTypes.filter((type: string) => type !== 'video'),
                  );
                }
              }}
            />
          </div>
        </div>

        <div className="pt-2 pb-1">
          <FormInput
            label={t('settings.downloadFolder')}
            placeholder={t('settings.downloadFolderPlaceholder')}
            value={config.spoofing.downloadPath || ''}
            onChange={(value: string) => updateConfig('spoofing', 'downloadPath', value)}
            endContent={
              <button
                type="button"
                onClick={() => void handleBrowseFolder()}
                className="p-1 rounded text-text-muted hover:text-primary transition-colors"
                aria-label={t('common.browse')}
              >
                <FolderSearch size={16} />
              </button>
            }
          />
        </div>
      </Group>

      <Modal isOpen={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
        <ModalContent>
          <ModalHeader className="text-danger flex items-center gap-2">
            <ShieldAlert size={20} />
            {t('config.highCostWarning')}
          </ModalHeader>
          <ModalBody className="text-text-primary">
            <p className="mb-2">{t('misc.confirmVideoUploads')}</p>
            <p className="font-semibold text-danger">{t('config.videoCostWarning1')}</p>
            <p className="mt-2 text-sm text-text-muted">{t('config.videoCostWarning2')}</p>
          </ModalBody>
          <ModalFooter>
            <Button color="default" variant="flat" onClick={() => setIsVideoModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              color="danger"
              onClick={() => {
                const types = [...config.spoofing.uploadTypes];
                if (!types.includes('video')) types.push('video');
                updateConfig('spoofing', 'uploadTypes', types);
                setIsVideoModalOpen(false);
              }}
            >
              {t('config.iUnderstandEnableIt')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
