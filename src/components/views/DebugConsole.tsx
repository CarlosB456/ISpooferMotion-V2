import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, Check, Copy, Terminal, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../utils/cn';
import {
  clearDebugLogs,
  getDebugLogs,
  type LogEntry,
  subscribeDebugLogs,
} from '../../utils/debugLogger';
import { Button } from '../ui/button';
import { Command, CommandGroup, CommandItem, CommandList } from '../ui/command';
import { JsonViewer } from '../ui/JsonViewer';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

function useLogs() {
  const [logs, setLogs] = useState<LogEntry[]>(getDebugLogs());
  useEffect(() => {
    return subscribeDebugLogs(setLogs);
  }, []);
  return logs;
}

interface DebugConsoleProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * An overlaid developer console that intercepts and displays all `addDebugLog` calls.
 *
 * Very useful for diagnosing issues in production builds where the standard
 * WebView inspector isn't available to the end user. Includes filtering by log level and source.
 */
export default function DebugConsole({ isOpen, onClose }: DebugConsoleProps) {
  const { t } = useLanguage();
  const logs = useLogs();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterLevels, setFilterLevels] = useState<string[]>(['info', 'success', 'warn', 'error']);
  const [isCopied, setIsCopied] = useState(false);
  const [showGoToBottom, setShowGoToBottom] = useState(false);
  const isAutoScrollEnabled = useRef(true);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      // Auto-scroll to bottom unless scrolled up manually.
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const atBottom = scrollHeight - scrollTop - clientHeight < 50;
      isAutoScrollEnabled.current = atBottom;
      setShowGoToBottom(!atBottom);
    }
  };

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
      });
      isAutoScrollEnabled.current = true;
      setShowGoToBottom(false);
    }
  };

  const filteredLogs = logs.filter(
    (log) =>
      (filterSource === 'all' || log.source === filterSource) && filterLevels.includes(log.level),
  );

  const groupedLogs = filteredLogs.reduce(
    (acc, currentLog) => {
      // Group identical logs together.
      const lastLog = acc[acc.length - 1];
      if (
        lastLog &&
        lastLog.message === currentLog.message &&
        lastLog.source === currentLog.source &&
        lastLog.level === currentLog.level
      ) {
        lastLog.count += 1;
        lastLog.timestamp = currentLog.timestamp;
      } else {
        acc.push({ ...currentLog, count: 1 });
      }
      return acc;
    },
    [] as (LogEntry & { count: number })[],
  );

  useEffect(() => {
    if (isOpen && scrollContainerRef.current && isAutoScrollEnabled.current) {
      const container = scrollContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [groupedLogs, isOpen]);

  const clearLogs = () => {
    clearDebugLogs();
  };

  const handleCopy = () => {
    const text = filteredLogs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.source.toUpperCase()}] ${l.level.toUpperCase()}: ${l.message}`,
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const filterOptions = [
    { value: 'all', label: t('debug.allLogs') },
    { value: 'console', label: t('debug.devToolsConsole') },
    { value: 'ism', label: t('debug.ismLogs') },
  ];

  const levelOptions = [
    { value: 'info', label: t('debug.info') },
    { value: 'success', label: t('debug.success') },
    { value: 'warn', label: t('debug.warnings') },
    { value: 'error', label: t('debug.errors') },
  ];

  const toggleLevel = (val: string) => {
    setFilterLevels((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="debug-console"
          initial={{ y: '100%', opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0.5 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="h-1/3 w-full bg-background/95 backdrop-blur-2xl flex flex-col z-40 overflow-hidden border-t border-border-subtle shadow-[0_-10px_40px_rgba(0,0,0,0.3)]"
        >
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50 shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-muted-foreground text-[13px] font-bold uppercase tracking-wider">
                <Terminal size={15} className="text-primary" /> {t('debug.title')}
              </div>
              <div className="w-40 z-50">
                <Select
                  value={filterSource}
                  onValueChange={(val) => {
                    if (val) setFilterSource(val);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={t('debug.allLogs')} />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48 z-50">
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-between h-8 text-xs px-3 font-normal"
                      />
                    }
                  >
                    {filterLevels.length === levelOptions.length
                      ? t('debug.logLevels')
                      : `${filterLevels.length} selected`}
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-0" align="start">
                    <Command>
                      <CommandList>
                        <CommandGroup>
                          {levelOptions.map((opt) => (
                            <CommandItem
                              key={opt.value}
                              onSelect={() => toggleLevel(opt.value)}
                              className="text-xs"
                            >
                              <div
                                className={cn(
                                  'mr-2 flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-primary',
                                  filterLevels.includes(opt.value)
                                    ? 'bg-primary text-primary-foreground'
                                    : 'opacity-50 [&_svg]:invisible',
                                )}
                              >
                                <Check className="h-3 w-3" />
                              </div>
                              {opt.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                aria-label={t('debug.copyLogs')}
              >
                {isCopied ? <Check size={15} /> : <Copy size={15} />}
              </button>
              <button
                onClick={clearLogs}
                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                aria-label={t('debug.clearLogs')}
              >
                <Trash2 size={15} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                aria-label={t('debug.hideConsole')}
              >
                <X size={15} />
              </button>
            </div>
          </div>
          <AnimatePresence>
            {showGoToBottom && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                onClick={scrollToBottom}
                className="absolute bottom-4 right-6 bg-accent text-foreground border px-3 py-1.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 shadow-lg hover:bg-muted hover:text-primary transition-colors z-50"
              >
                <ArrowDown size={14} /> {t('debug.goToBottom')}
              </motion.button>
            )}
          </AnimatePresence>
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-2 font-mono text-[11px] flex flex-col gap-0.5 selection:bg-primary/30"
            style={{ overflowAnchor: 'none' }}
          >
            {groupedLogs.length === 0 ? (
              <div className="text-muted-foreground italic flex items-center justify-center h-full">
                {t('debug.noLogs')}
              </div>
            ) : (
              groupedLogs.map((log, index) => (
                <div
                  key={`${log.id}-${index}`}
                  className={cn(
                    'flex items-start gap-3 py-1.5 px-3 rounded border border-transparent',
                    log.level === 'error'
                      ? 'text-destructive bg-destructive/5 border-destructive/10'
                      : log.level === 'warn'
                        ? 'text-yellow-500 bg-yellow-500/5 border-yellow-500/10'
                        : log.level === 'success'
                          ? 'text-green-500 bg-green-500/5 border-green-500/10'
                          : 'text-foreground hover:bg-accent/50',
                  )}
                >
                  <span className="text-muted-foreground shrink-0 min-w-17.5 select-none opacity-60 flex items-center gap-1.5">
                    {log.timestamp}
                    {log.count > 1 && (
                      <span className="bg-border/40 text-foreground px-1 rounded font-bold text-[9px] shadow-sm">
                        x{log.count}
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'uppercase shrink-0 min-w-15 font-bold select-none',
                      log.level === 'error'
                        ? 'text-destructive'
                        : log.level === 'warn'
                          ? 'text-yellow-500'
                          : log.level === 'success'
                            ? 'text-green-500'
                            : 'text-primary/70',
                    )}
                  >
                    {log.level}
                  </span>
                  <span className="text-muted-foreground shrink-0 min-w-12.5 font-bold select-none opacity-40">
                    [{log.source === 'ism' ? 'ISM' : 'DEV'}]
                  </span>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    {log.message && (
                      <span className="wrap-break-word whitespace-pre-wrap leading-relaxed">
                        {log.message.split('\n').map((line, i) => {
                          const isTrace = /^\s*at\s+/.test(line);
                          if (isTrace) {
                            return (
                              <div key={i} className="text-muted-foreground opacity-80 pl-4">
                                {line.replace(/^\s*at\s+/, '↳ at ')}
                              </div>
                            );
                          }
                          return <div key={i}>{line}</div>;
                        })}
                      </span>
                    )}
                    {log.payload && log.payload.length > 0 && (
                      <div className="flex flex-col gap-2 mt-1">
                        {log.payload.map((p, i) => (
                          <div
                            key={i}
                            className="bg-background/50 rounded-md p-1.5 border border-border/30 overflow-x-auto"
                          >
                            <JsonViewer data={p} defaultExpanded={log.level === 'error'} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
