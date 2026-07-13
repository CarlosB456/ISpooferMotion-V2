import { invoke } from '@tauri-apps/api/core';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  FileText,
  Play,
  RotateCcw,
  Trash2,
  User2,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { useConfig } from '../../contexts/ConfigContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { itemVariants, pageVariants } from '../../utils/animations';
import { queueSpoofRetry, type SpoofJob } from '../../utils/jobTypes';
import { logIsm } from '../../utils/robloxProfiles';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

/**
 * Renders the Job History and Activity pane.
 *
 * Pulls the persistent list of past spoofing jobs from the Rust backend and displays them
 * in a reverse-chronological accordion. Allows users to retry failed assets or redo entire jobs.
 */
export default function ActivityView() {
  const { t } = useLanguage();

  const { updateConfig } = useConfig();
  const [jobs, setJobs] = useState<SpoofJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchJobs = async () => {
    try {
      const data = await invoke<SpoofJob[]>('get_jobs');
      const finalJobs = data ? [...data] : [];

      setJobs(finalJobs);
    } catch (e) {
      logIsm('error', `Failed to load job history: ${e}`, true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleDelete = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await invoke('delete_job', { jobId });
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch (error) {
      logIsm('error', `Could not delete job: ${error}`, true);
    }
  };

  const handleOpenLog = async (logPath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await invoke('open_job_log', { logPath });
    } catch (error) {
      logIsm('error', `Could not open log: ${error}`, true);
    }
  };

  const handleRedoJob = (job: SpoofJob, e: React.MouseEvent) => {
    e.stopPropagation();
    const assetIds = job.assetResults.map((r) => r.id);
    queueSpoofRetry({
      jobId: job.id,
      assetIds,
      selectedUserId: job.account?.id,
      selectedGroupId: job.config?.groupId ?? undefined,
      spoofSounds: job.config?.spoofSounds,
      uploadTypes: job.config?.uploadTypes,
      account: job.account,
      group: job.group,
    });
    updateConfig('ui', 'activeTab', 'spoofing');
  };

  const handleRetryFailed = (job: SpoofJob, e: React.MouseEvent) => {
    e.stopPropagation();
    const failedIds = job.assetResults.filter((r) => !r.success && !r.skipped).map((r) => r.id);
    if (failedIds.length === 0) return;
    queueSpoofRetry({
      jobId: job.id,
      assetIds: failedIds,
      selectedUserId: job.account?.id,
      selectedGroupId: job.config?.groupId ?? undefined,
      spoofSounds: job.config?.spoofSounds,
      uploadTypes: job.config?.uploadTypes,
      account: job.account,
      group: job.group,
    });
    updateConfig('ui', 'activeTab', 'spoofing');
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className="w-full h-full"
    >
      <motion.div variants={itemVariants} className="w-full h-full flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-muted-foreground">{t('misc.loadingHistory')}</span>
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-3">
              <Clock size={48} className="opacity-20" />
              <p>{t('misc.noJobHistory')}</p>
              <p className="text-[13px] opacity-70">{t('misc.jobsWillAppear')}</p>
            </div>
          ) : (
            <Accordion className="space-y-4 pb-8 w-full">
              {jobs.map((job) => {
                const totalAssets = job.assetResults?.length || 0;
                const failedAssets =
                  job.assetResults?.filter((r) => !r.success && !r.skipped).length || 0;

                const dateStr = new Date(job.startTime).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                });

                return (
                  <AccordionItem
                    key={job.id}
                    value={job.id}
                    className="bg-card border border-border/50 shadow-sm rounded-xl overflow-hidden mb-4"
                  >
                    <AccordionTrigger className="hover:no-underline py-2 pr-3 pl-1 data-[state=open]:border-b data-[state=open]:border-border/30">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-4">
                          <div className="relative w-11 h-11 shrink-0">
                            {job.account?.avatarUrl ? (
                              <img
                                src={job.account.avatarUrl}
                                alt=""
                                className="w-11 h-11 rounded-full border border-border object-cover bg-background shadow-sm"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-full border border-border bg-background flex items-center justify-center shadow-sm">
                                <User2 size={20} className="text-muted-foreground" />
                              </div>
                            )}
                            {job.group?.iconUrl && (
                              <img
                                src={job.group.iconUrl}
                                alt=""
                                className="w-5.5 h-5.5 rounded-full border-[2.5px] border-card absolute -bottom-1 -right-1 object-cover bg-background shadow-sm"
                              />
                            )}
                          </div>
                          <div className="flex flex-col items-start gap-0.5">
                            <span className="text-[15px] font-semibold text-foreground tracking-tight text-left">
                              {job.group
                                ? t('activity.spoofedTo').replace('{name}', job.group.name)
                                : t('activity.spoofedTo').replace(
                                    '{name}',
                                    job.account?.name || t('common.unknown'),
                                  )}
                            </span>
                            <span className="text-[13px] text-muted-foreground flex items-center gap-2">
                              {dateStr}
                              <span className="w-1 h-1 rounded-full bg-border" />
                              <span className="font-medium">
                                {t('activity.assetCount').replace(
                                  '{count}',
                                  totalAssets.toString(),
                                )}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="p-0">
                      <div className="px-4 pb-4 pt-3 bg-muted/20">
                        <div className="flex flex-wrap items-center gap-5 mb-4 px-1">
                          <button
                            type="button"
                            onClick={(e) => handleRedoJob(job, e)}
                            className="flex items-center text-[13px] font-medium text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Play size={14} className="mr-1.5" />
                            {t('activity.redoJob')}
                          </button>
                          {failedAssets > 0 && (
                            <button
                              type="button"
                              onClick={(e) => handleRetryFailed(job, e)}
                              className="flex items-center text-[13px] font-medium text-muted-foreground hover:text-yellow-500 transition-colors"
                            >
                              <RotateCcw size={14} className="mr-1.5" />
                              {t('activity.retryFailed').replace(
                                '{count}',
                                failedAssets.toString(),
                              )}
                            </button>
                          )}
                          {job.logFilePath && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenLog(job.logFilePath, e)}
                              className="flex items-center text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <FileText size={14} className="mr-1.5" />
                              {t('activity.viewLog')}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleDelete(job.id, e)}
                            className="flex items-center text-[13px] font-medium text-muted-foreground hover:text-destructive transition-colors ml-auto"
                          >
                            <Trash2 size={14} className="mr-1.5" />
                            {t('common.delete')}
                          </button>
                        </div>

                        <div className="space-y-1 max-h-72 overflow-y-auto pr-2 rounded-md border border-border/50 p-2 bg-background/50">
                          {job.assetResults?.map((res, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 text-[12px] transition-colors"
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                {res.success ? (
                                  <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                                ) : res.skipped ? (
                                  <div className="w-3.5 h-3.5 rounded-full border border-yellow-500/50 flex items-center justify-center shrink-0">
                                    <div className="w-1.5 h-0.5 bg-yellow-500/50 rounded-full" />
                                  </div>
                                ) : (
                                  <XCircle size={14} className="text-destructive shrink-0" />
                                )}
                                <span className="font-mono text-muted-foreground w-24 shrink-0">
                                  {res.id}
                                </span>
                                <span className="truncate text-foreground max-w-50">
                                  {res.name || t('activity.unknownAsset')}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                {res.newId && (
                                  <span className="font-mono text-green-500">→ {res.newId}</span>
                                )}
                                {res.errorReason && (
                                  <span
                                    className="text-destructive max-w-50 truncate"
                                    title={res.errorReason}
                                  >
                                    {res.errorReason}
                                  </span>
                                )}
                                {res.reason && res.skipped && (
                                  <span className="text-yellow-500/80 max-w-50 truncate">
                                    {res.reason}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
