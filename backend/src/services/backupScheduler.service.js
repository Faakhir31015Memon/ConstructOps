import logger from '../utils/logger.js';
import { runBackup } from './backup.service.js';

// In-process daily DB backup for long-running hosts (Render container etc).
// On serverless the schedule should live in the provider cron and call the same
// runBackup() via `npm run backup`. Backups land in BACKUP_DIR — on ephemeral
// containers point it at a mounted disk or treat Atlas snapshots as the durable
// copy; prune keeps the newest BACKUP_KEEP sets.

const CHECK_EVERY_MINUTES = 30;
let timer = null;
let lastRunDay = null;

const startBackupScheduler = () => {
  const hours = Number(process.env.BACKUP_INTERVAL_HOURS || 0);
  if (!hours || hours <= 0) {
    logger.info('Backup scheduler off — set BACKUP_INTERVAL_HOURS=24 for automatic daily backups');
    return null;
  }

  const tick = async () => {
    const now = Date.now();
    if (lastRunDay && now - lastRunDay < (hours - 0.5) * 60 * 60 * 1000) return;
    try {
      await runBackup({ quiet: true });
      lastRunDay = now;
    } catch (error) {
      logger.error('Scheduled backup failed', { error: error.message });
    }
  };

  timer = setInterval(() => {
    tick().catch(() => {});
  }, CHECK_EVERY_MINUTES * 60 * 1000);
  timer.unref?.();

  logger.info('Backup scheduler started', { intervalHours: hours });
  return timer;
};

export default startBackupScheduler;
