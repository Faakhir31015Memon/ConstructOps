import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { EJSON } from 'bson';
import logger from '../utils/logger.js';

// Same engine as scripts/backup-db.mjs — extracted so the in-process scheduler
// and the CLI share one implementation. Requires an open mongoose connection.

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);

const isBackable = (name) => !name.startsWith('system.') && !name.startsWith('oplog');

const backupCollection = async (db, name, file) => {
  const stream = fs.createWriteStream(file);
  let count = 0;
  let bytes = 0;
  for await (const doc of db.collection(name).find({}).batchSize(500)) {
    // Canonical Extended JSON keeps ObjectId / Date / Decimal128 types on disk.
    const line = `${EJSON.stringify(doc, { relaxed: false })}\n`;
    bytes += Buffer.byteLength(line);
    count += 1;
    if (!stream.write(line)) {
      await new Promise((resolve) => stream.once('drain', resolve));
    }
  }
  await new Promise((resolve, reject) => stream.end((err) => (err ? reject(err) : resolve())));
  return { name, count, bytes };
};

const prune = (dir, keep) => {
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const stale = entries.slice(0, Math.max(0, entries.length - keep));
  stale.forEach((name) => fs.rmSync(path.join(dir, name), { recursive: true, force: true }));
  return stale;
};

export const runBackup = async ({ outRoot, root = process.cwd(), quiet = false } = {}) => {
  const log = quiet ? (msg) => logger.info('Backup', { msg }) : console.log;
  const base = path.resolve(outRoot || process.env.BACKUP_DIR || path.join(root, 'backups'), '.');

  const db = mongoose.connection.db;
  if (!db) throw new Error('runBackup needs an open MongoDB connection');

  const dest = path.join(base, stamp());
  fs.mkdirSync(dest, { recursive: true });

  const names = (await db.listCollections().toArray()).map((c) => c.name).filter(isBackable).sort();
  log(`Backing up ${names.length} collections from ${db.databaseName}`);

  const stats = [];
  for (const name of names) {
    const stat = await backupCollection(db, name, path.join(dest, `${name}.jsonl`));
    stats.push(stat);
  }

  let uploadsCopied = false;
  if (process.env.BACKUP_UPLOADS === '1') {
    const uploads = path.resolve(root, 'uploads');
    if (fs.existsSync(uploads)) {
      fs.cpSync(uploads, path.join(dest, 'uploads'), { recursive: true });
      uploadsCopied = true;
    }
  }

  const manifest = {
    createdAt: new Date().toISOString(),
    database: db.databaseName,
    engine: 'constructops-jsonl-backup/2',
    uploadsCopied,
    totalDocs: stats.reduce((sum, s) => sum + s.count, 0),
    totalBytes: stats.reduce((sum, s) => sum + s.bytes, 0),
    collections: stats,
  };
  fs.writeFileSync(path.join(dest, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const removed = prune(base, Number(process.env.BACKUP_KEEP || 14));
  if (removed.length) log(`Pruned ${removed.length} old backup(s): ${removed.join(', ')}`);
  log(`Backup written to ${dest} (${manifest.totalDocs} docs, ${(manifest.totalBytes / 1024 / 1024).toFixed(2)} MB)`);
  return { dest, manifest };
};

export default runBackup;
