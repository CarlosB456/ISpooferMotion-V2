import { Spinner } from '@codycon/ism-library';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Users, UserSquare2 } from 'lucide-react';
import { type ReactNode, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useLanguage } from '../../../contexts/LanguageContext';
import { cn } from '../../../utils/cn';
import { normalizeId, type RobloxGroup, type RobloxUserInfo } from '../../../utils/robloxProfiles';

export type AudioQuotaDisplay =
  | { status: 'idle' | 'loading' | 'unavailable' }
  | { status: 'ready'; remaining: number; capacity: number };

export function parseAudioQuota(payload: unknown): AudioQuotaDisplay | null {
  // Quota limits are returned as nested arrays depending on the endpoint version.
  // Parse safely to display remaining uploads.
  if (!payload || typeof payload !== 'object') return null;

  const response = payload as Record<string, unknown>;
  const records = Array.isArray(payload)
    ? payload
    : Array.isArray(response.assetQuotas)
      ? response.assetQuotas
      : Array.isArray(response.quotas)
        ? response.quotas
        : [payload];
  const record =
    records.find((item) => {
      if (!item || typeof item !== 'object') return false;
      const assetType = String((item as Record<string, unknown>).assetType || '').toLowerCase();
      return !assetType || assetType === 'audio';
    }) || records[0];

  if (!record || typeof record !== 'object') return null;
  const quota = record as Record<string, unknown>;
  const capacity = Number(quota.capacity);
  const usage = Number(quota.usage);
  if (!Number.isFinite(capacity) || !Number.isFinite(usage)) return null;

  return {
    status: 'ready',
    remaining: Math.max(0, capacity - usage),
    capacity,
  };
}

function DropdownChevron({ open }: { open: boolean }) {
  return (
    <motion.span
      initial={false}
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className="text-text-muted shrink-0"
    >
      <ChevronDown size={14} />
    </motion.span>
  );
}

function DropdownPortal({
  open,
  setOpen,
  coords,
  children,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  coords: { top: number; left: number; width: number };
  children: ReactNode;
}) {
  // Render dropdowns outside the DOM node to prevent clipping from overflow:hidden.
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-490" onPointerDown={() => setOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            onPointerDown={(event) => event.stopPropagation()}
            className="fixed z-500 bg-bg-surface border border-border-subtle rounded-md shadow-floating backdrop-blur-xl p-1"
            style={{
              top: coords.top,
              left: coords.left,
              width: coords.width,
              minWidth: 180,
            }}
          >
            <div className="max-h-64 overflow-y-auto flex flex-col gap-0.5">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function EmptyAvatar({ group = false, size = 12 }: { group?: boolean; size?: number }) {
  return (
    <div className="rounded-full bg-bg-elevated flex items-center justify-center w-full h-full">
      {group ? (
        <Users size={size} className="text-text-muted" />
      ) : (
        <UserSquare2 size={size} className="text-text-muted" />
      )}
    </div>
  );
}

export function AvatarDropdown({
  users,
  value,
  audioQuota,
  showAudioQuota,
}: {
  users: RobloxUserInfo[];
  value: string;
  onChange: (value: string) => void;
  loading: boolean;
  audioQuota: AudioQuotaDisplay;
  showAudioQuota?: boolean;
}) {
  const { t } = useLanguage();
  const selected = users.find((user) => normalizeId(user.id) === normalizeId(value));
  const label = selected ? selected.displayName || selected.name : t('common.none');
  const audioQuotaLabel = !selected
    ? t('spoof.audioQuotaSelectUser')
    : !showAudioQuota
      ? t('spoof.audioQuotaEnableAudio')
      : audioQuota.status === 'idle'
        ? t('spoof.audioQuotaAddCookie')
        : audioQuota.status === 'loading'
          ? t('spoof.audioQuotaChecking')
          : audioQuota.status === 'ready'
            ? t('spoof.audioQuotaLeft')
                .replace('{remaining}', String(audioQuota.remaining))
                .replace('{capacity}', String(audioQuota.capacity))
            : t('spoof.audioQuotaUnavailable');

  return (
    <div className="flex w-full flex-col gap-1.5">
      <span className="text-sm font-medium text-text-primary shrink-0">
        {t('spoof.selectedUser')}
      </span>
      <div className="flex items-center gap-3 h-12 w-full">
        <motion.div
          key={`${selected?.id || 'none'}-img`}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-8 h-8 shrink-0"
        >
          {selected?.avatarUrl ? (
            <img
              src={selected.avatarUrl}
              alt={label}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20"
            />
          ) : (
            <EmptyAvatar size={14} />
          )}
        </motion.div>
        <motion.div
          key={`${selected?.id || 'none'}-info`}
          initial={{ opacity: 0, x: 6 }}
          animate={{ opacity: 1, x: 0 }}
          className="min-w-0 flex-1"
        >
          <div className="truncate text-sm font-semibold text-text-primary leading-4">{label}</div>
          <div className="truncate text-[10px] leading-3 font-medium text-text-muted mt-0.5">
            {audioQuotaLabel}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function GroupDropdown({
  groups,
  value,
  onChange,
  loading,
}: {
  groups: RobloxGroup[];
  value: string;
  onChange: (value: string) => void;
  loading: boolean;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 200 });
  const selected = groups.find((group) => normalizeId(group.id) === normalizeId(value));

  const toggle = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpen((current) => !current);
  };

  return (
    <div className="flex flex-col items-start gap-1.5 w-full">
      <span className="text-sm font-medium text-text-primary shrink-0">
        {t('spoof.selectedGroup')}
      </span>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className="flex items-center gap-2 h-10 px-3 bg-bg-surface border border-border-strong rounded-md text-[13px] font-medium text-text-primary hover:border-primary transition-colors w-full"
      >
        <motion.div
          key={`${selected?.id || 'none'}-icon`}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative w-6 h-6 shrink-0"
        >
          {loading ? (
            <Spinner size="sm" color="current" className="text-text-muted" />
          ) : selected?.iconUrl ? (
            <img
              src={selected.iconUrl}
              alt={selected.name}
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <EmptyAvatar group />
          )}
        </motion.div>
        <motion.div
          key={selected?.id || 'none'}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          className="min-w-0 flex-1 text-left truncate"
        >
          {selected?.name || t('common.none')}
        </motion.div>
        <DropdownChevron open={open} />
      </button>

      <DropdownPortal open={open} setOpen={setOpen} coords={coords}>
        <button
          type="button"
          onClick={() => {
            onChange('none');
            setOpen(false);
          }}
          className={cn(
            'flex items-center gap-3 w-full px-2 py-1.5 text-left text-[13px] rounded-sm hover:bg-bg-elevated transition-colors',
            value === 'none' ? 'text-primary font-semibold' : 'text-text-primary',
          )}
        >
          <div className="w-7 h-7 shrink-0">
            <EmptyAvatar group size={14} />
          </div>
          {t('common.none')}
        </button>
        {groups.map((group, index) => (
          <motion.button
            key={group.id}
            type="button"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.14,
              delay: Math.min(index * 0.025, 0.12),
            }}
            onClick={() => {
              onChange(String(group.id));
              setOpen(false);
            }}
            className={cn(
              'flex items-center gap-3 w-full px-2 py-1.5 text-left text-[13px] rounded-sm hover:bg-bg-elevated transition-colors',
              normalizeId(group.id) === normalizeId(value)
                ? 'text-primary font-semibold'
                : 'text-text-primary',
            )}
          >
            <div className="w-7 h-7 shrink-0">
              {group.iconUrl ? (
                <img
                  src={group.iconUrl}
                  alt={group.name}
                  className="w-full h-full rounded-full object-cover ring-1 ring-border-subtle"
                />
              ) : (
                <EmptyAvatar group size={14} />
              )}
            </div>
            <span className="truncate font-medium">{group.name}</span>
          </motion.button>
        ))}
        {groups.length === 0 && !loading && (
          <div className="px-3 py-4 text-center text-[12px] text-text-muted">
            {t('spoof.noGroupsFound')}
          </div>
        )}
      </DropdownPortal>
    </div>
  );
}
