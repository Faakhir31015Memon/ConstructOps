import '../src/config/env.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { EJSON } from 'bson';
import connectDB from '../src/config/db.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);

const isBackable = (name) => !name.startsWith('system.') && !name.startsWith('oplog');

const backupCollection = async (db, name, file) => {
  const stream = fs.createWriteStream(file);
  let count = 0;
  let bytes = 0;
  for await (const doc of db.collection(name).find({}).batchSize(500)) {
    // Canonical Extended JSON keeps ObjectId / Date / Decimal128 types on disk.
    // Plain JSON here would silently turn every id into a 24-char string, and the
    // restored app would query for ObjectIds that no longer exist.
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

const run = async () => {
  const outRoot = path.resolve(ROOT, process.argv[2] || process.env.BACKUP_DIR || 'backups');
  fs.mkdirSync(outRoot, { recursive: true });

  const connection = await connectDB();
  const db = connection.connection.db;
  const dest = path.join(outRoot, stamp());
  fs.mkdirSync(dest, { recursive: true });

  const names = (await db.listCollections().toArray())
    .map((c) => c.name)
    .filter(isBackable)
    .sort();

  console.log(`Backing up ${names.length} collections from ${db.databaseName}`);
  const stats = [];
  for (const name of names) {
    const stat = await backupCollection(db, name, path.join(dest, `${name}.jsonl`));
    stats.push(stat);
    console.log(`  ${name.padEnd(24)} ${String(stat.count).padStart(7)} docs  ${(stat.bytes / 1024).toFixed(1)} KB`);
  }

  let uploadsCopied = false;
  if (process.env.BACKUP_UPLOADS === '1') {
    const uploads = path.resolve(ROOT, 'uploads');
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

  const removed = prune(outRoot, Number(process.env.BACKUP_KEEP || 14));
  if (removed.length) console.log(`Pruned ${removed.length} old backup(s): ${removed.join(', ')}`);

  console.log(`\nBackup written to ${dest}`);
  console.log(`${manifest.totalDocs} documents, ${(manifest.totalBytes / 1024 / 1024).toFixed(2)} MB`);
  if (!uploadsCopied) console.log('Uploads folder NOT included (set BACKUP_UPLOADS=1 to include site photos).');

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('Backup failed:', error.message);
  process.exitCode = 1;
  await mongoose.disconnect().catch(() => {});
});
