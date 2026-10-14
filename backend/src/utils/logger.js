// Structured JSON logs so hosted platforms (Render/Railway/Atlas logs) can filter by level.
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[(process.env.LOG_LEVEL || 'info').toLowerCase()] ?? LEVELS.info;

const emit = (level, msg, meta) => {
  if (LEVELS[level] < threshold) return;
  const entry = { level, time: new Date().toISOString(), msg };
  if (meta && Object.keys(meta).length > 0) entry.meta = meta;
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
};

export const logger = {
  debug: (msg, meta) => emit('debug', msg, meta),
  info: (msg, meta) => emit('info', msg, meta),
  warn: (msg, meta) => emit('warn', msg, meta),
  error: (msg, meta) => emit('error', msg, meta),
  // morgan writes each access line through this stream
  stream: {
    write: (message) => emit('info', 'http', { line: message.trim() }),
  },
};

export default logger;
