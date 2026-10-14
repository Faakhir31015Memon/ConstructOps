import Project from '../models/project.model.js';
import { sendProjectDigest } from './notification.service.js';
import logger from '../utils/logger.js';

// 21:00 Pakistan = 16:00 UTC — the hour site owners are back from the field.
const DIGEST_HOUR_UTC = Number(process.env.DIGEST_HOUR_UTC ?? 16);
const CHECK_EVERY_MINUTES = 15;
let timer = null;

const isToday = (value) => {
  if (!value) return false;
  return new Date(value).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
};

export const runDigestCycle = async ({ force = false } = {}) => {
  const filter = { status: 'active', 'notify.dailyDigest': true };
  const projects = await Project.find(filter).limit(500);
  const results = [];

  for (const project of projects) {
    if (!force && isToday(project.notify?.lastDigestAt)) continue;
    try {
      const outcome = await sendProjectDigest(project);
      if (outcome.delivered) {
        project.notify.lastDigestAt = new Date();
        await project.save({ validateBeforeSave: false });
      }
      results.push({ projectId: String(project._id), delivered: outcome.delivered, reason: outcome.reason });
    } catch (error) {
      logger.error('Digest cycle failed for project', { projectId: String(project._id), error: error.message });
    }
  }

  if (results.length) logger.info('Digest cycle finished', { sent: results.filter((r) => r.delivered).length, attempted: results.length });
  return results;
};

/**
 * Long-running host only. On serverless platforms the schedule should live in the
 * provider's cron product; the same work runs through runDigestCycle().
 */
export const startDigestScheduler = () => {
  if (process.env.DIGEST_AUTOMATIC !== '1') {
    logger.info('Digest scheduler off — set DIGEST_AUTOMATIC=1 to send daily site digests');
    return null;
  }

  const tick = async () => {
    const hour = new Date().getUTCHours();
    if (hour < DIGEST_HOUR_UTC || hour > DIGEST_HOUR_UTC + 2) return;
    await runDigestCycle().catch((error) => logger.error('Digest tick failed', { error: error.message }));
  };

  timer = setInterval(() => {
    tick().catch(() => {});
  }, CHECK_EVERY_MINUTES * 60 * 1000);
  timer.unref?.();

  logger.info('Digest scheduler started', { hourUtc: DIGEST_HOUR_UTC });
  return timer;
};

export const stopDigestScheduler = () => {
  if (timer) clearInterval(timer);
  timer = null;
};

export default startDigestScheduler;
