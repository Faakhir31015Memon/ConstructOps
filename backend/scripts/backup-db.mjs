import '../src/config/env.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import { runBackup } from '../src/services/backup.service.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const run = async () => {
  const outRoot = path.resolve(ROOT, process.argv[2] || process.env.BACKUP_DIR || 'backups');
  await connectDB();
  const { manifest } = await runBackup({ outRoot, root: ROOT });
  if (!manifest.uploadsCopied) {
    console.log('Uploads folder NOT included (set BACKUP_UPLOADS=1 to include site photos).');
  }
  console.log(`${manifest.totalDocs} documents, ${(manifest.totalBytes / 1024 / 1024).toFixed(2)} MB`);
};

run().then(async () => {
  await mongoose.disconnect().catch(() => {});
}).catch(async (error) => {
  console.error('Backup failed:', error.message);
  process.exitCode = 1;
  await mongoose.disconnect().catch(() => {});
});
