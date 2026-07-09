import { MultiSelectDropdown } from '@codycon/ism-library';
import { Filter, FolderOpen } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

export const ASSET_TYPE_OPTIONS = [
  { value: 'audio', label: 'Audio' },
  { value: 'image', label: 'Images' },
  { value: 'animation', label: 'Animations' },
  { value: 'mesh', label: 'Meshes' },
];

export interface ExplorerToolbarProps {
  loadedFileName: string | null;
  activeAssetFilters: string[];
  setActiveAssetFilters: (filters: string[]) => void;
}

export function ExplorerToolbar({
  loadedFileName,
  activeAssetFilters,
  setActiveAssetFilters,
}: ExplorerToolbarProps) {
  const { t } = useLanguage();

  if (!loadedFileName) return null;

  return (
    <div className="px-3 pt-3 pb-2 flex flex-col gap-2 border-b border-border-subtle">
      <div className="flex items-center gap-2 text-[10px] text-text-muted">
        <FolderOpen size={11} />
        <span className="truncate font-medium">{loadedFileName}</span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <Filter size={13} className="shrink-0 text-text-muted" />
        <div className="min-w-0 flex-1">
          <MultiSelectDropdown
            options={ASSET_TYPE_OPTIONS.map((a) => ({
              ...a,
              label: t(
                'explorer.' +
                  (a.value === 'image'
                    ? 'images'
                    : a.value === 'animation'
                      ? 'animations'
                      : a.value === 'mesh'
                        ? 'meshes'
                        : a.value),
              ),
            }))}
            values={activeAssetFilters}
            onChange={setActiveAssetFilters}
            placeholder={t('explorer.allAssetTypes')}
          />
        </div>
      </div>
    </div>
  );
}

