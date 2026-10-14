import '../src/config/env.js';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const run = async () => {
  const modelsDir = path.resolve(HERE, '../src/models');
  const files = fs.readdirSync(modelsDir).filter((f) => f.endsWith('.model.js'));
  for (const file of files) {
    await import(pathToFileURL(path.join(modelsDir, file)).href);
  }

  await connectDB();
  const models = Object.entries(mongoose.models);
  console.log(`Building indexes for ${models.length} collections…`);

  for (const [name, model] of models) {
    await model.syncIndexes();
  }

  let total = 0;
  for (const [name, model] of models) {
    const live = await model.collection.indexes();
    total += live.length;
    const interesting = live
      .filter((idx) => idx.name !== '_id_')
      .map((idx) => `${Object.keys(idx.key).join('+')}${idx.unique ? ' (unique)' : ''}${idx.expireAfterSeconds !== undefined ? ' (ttl)' : ''}`);
    console.log(`  ${name.padEnd(22)} ${String(live.length).padStart(2)} indexes${interesting.length ? ` — ${interesting.join(', ')}` : ''}`);
  }

  console.log(`\n${total} indexes live across ${models.length} collections.`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('Index build failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
