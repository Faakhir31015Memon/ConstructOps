import '../src/config/env.js';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { EJSON } from 'bson';
import connectDB from '../src/config/db.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BATCH = 500;

// Canonical Extended JSON restores ObjectId / Date / Decimal128 exactly as they
// were read. Plain JSON would store every id as a string, and every cast query
// (`findById`, `{companyId: <ObjectId>}`) would then miss its own documents.
const readJsonl = (file) =>
  fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => EJSON.parse(line));

const loadModels = async () => {
  const modelsDir = path.resolve(HERE, '../src/models');
  for (const file of fs.readdirSync(modelsDir)) {
    if (file.endsWith('.model.js')) await import(pathToFileURL(path.join(modelsDir, file)).href);
  }
};

const run = async () => {
  const dir = path.resolve(process.argv[2] || '');
  const confirmed = process.argv.includes('--yes');

  if (!fs.existsSync(path.join(dir, 'manifest.json'))) {
    console.error('Usage: node scripts/restore-db.mjs <backup-folder> --yes');
    console.error('       (the folder must contain a manifest.json written by backup-db.mjs)');
    process.exit(1);
  }
  if (!confirmed) {
    console.error('Refusing to restore without --yes. This overwrites every collection in the target database.');
    process.exit(1);
  }
  if (process.env.NODE_ENV === 'production' && process.env.FORCE_RESTORE !== '1') {
    console.error('Production restore blocked. Re-run with FORCE_RESTORE=1 if you really mean it.');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  console.log(`Restoring ${manifest.database} — ${manifest.totalDocs} docs from ${dir}`);
  if (manifest.engine !== 'constructops-jsonl-backup/2') {
    console.warn('WARNING: this dump predates Extended JSON. After restoring, run');
    console.warn('         "npm run repair-types" or every id in this database stays a string.');
  }

  const connection = await connectDB();
  const db = connection.connection.db;

  for (const entry of manifest.collections) {
    const file = path.join(dir, `${entry.name}.jsonl`);
    if (!fs.existsSync(file)) {
      console.warn(`  ${entry.name}: no dump file, skipped`);
      continue;
    }
    const docs = readJsonl(file);
    await db.collection(entry.name).deleteMany({});
    if (docs.length) {
      for (let i = 0; i < docs.length; i += BATCH) {
        await db.collection(entry.name).insertMany(docs.slice(i, i + BATCH), { ordered: false });
      }
    }
    console.log(`  ${entry.name.padEnd(24)} ${String(docs.length).padStart(7)} docs restored`);
  }

  await loadModels();
  await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));
  console.log('Indexes re-synced from the current schemas.');

  if (manifest.uploadsCopied && fs.existsSync(path.join(dir, 'uploads'))) {
    const uploads = path.resolve(HERE, '../uploads');
    fs.cpSync(path.join(dir, 'uploads'), uploads, { recursive: true });
    console.log('Uploads folder restored.');
  }

  console.log('\nRestore complete.');
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('Restore failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
