import { bulkCheckInAttendance } from '../services/api';

/**
 * Attendance captured on a site with no signal is written here (localStorage) and
 * replayed through the idempotent bulk endpoint as soon as the connection returns.
 */
const STORAGE_KEY = 'constructops_offline_attendance';
const MAX_QUEUE = 2000;

const listeners = new Set();

const read = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const write = (input) => {
  const records = input.slice(-MAX_QUEUE);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    /* storage full or unavailable — records are already lost, do not throw */
  }
  listeners.forEach((listener) => listener(records));
};

export const subscribeToQueue = (listener) => {
  listeners.add(listener);
  listener(read());
  return () => listeners.delete(listener);
};

export const getQueuedRecords = () => read();

export const queueAttendance = (record) => {
  const records = read();
  records.push({
    projectId: String(record.projectId),
    workerId: String(record.workerId),
    date: record.date,
    status: record.status === 'absent' ? 'absent' : 'present',
    queuedAt: Date.now(),
  });
  write(records);
  return records.length;
};

export const queueManyAttendance = (list) => {
  const records = read();
  list.forEach((record) =>
    records.push({
      projectId: String(record.projectId),
      workerId: String(record.workerId),
      date: record.date,
      status: record.status === 'absent' ? 'absent' : 'present',
      queuedAt: Date.now(),
    })
  );
  write(records);
  return records.length;
};

/** Replays everything currently queued. Resolves with the number still pending. */
export const flushQueue = async () => {
  const records = read();
  if (records.length === 0) return 0;
  if (!navigator.onLine) return records.length;
  // Never fire a background request without a session — it would bounce the user
  // to the login screen through the 401 interceptor.
  if (!localStorage.getItem('token')) return records.length;

  const byProject = new Map();
  records.forEach((record) => {
    if (!byProject.has(record.projectId)) byProject.set(record.projectId, []);
    byProject.get(record.projectId).push(record);
  });

  const synced = [];
  for (const [projectId, rows] of byProject.entries()) {
    try {
      // Chunked so a site that was offline for weeks still fits the 500-row limit.
      for (let i = 0; i < rows.length; i += 400) {
        const chunk = rows.slice(i, i + 400);
        await bulkCheckInAttendance(
          projectId,
          chunk.map((row) => ({ workerId: row.workerId, date: row.date, status: row.status }))
        );
        synced.push(...chunk);
      }
    } catch {
      // Signed out or server rejected it: keep them queued and retry on next online event.
      break;
    }
  }

  if (synced.length) {
    const syncedKeys = new Set(synced.map((r) => `${r.projectId}|${r.workerId}|${r.date}|${r.status}`));
    write(read().filter((r) => !syncedKeys.has(`${r.projectId}|${r.workerId}|${r.date}|${r.status}`)));
  }
  return read().length;
};

/** Call once at app start. */
export const startOfflineSync = () => {
  window.addEventListener('online', () => {
    flushQueue().catch(() => {});
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') flushQueue().catch(() => {});
  });
  if (navigator.onLine) flushQueue().catch(() => {});
};

export default queueAttendance;
