import '../src/config/env.js';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';

// Repairs a database whose documents were bulk-inserted from plain JSON (the
// pre-Extended-JSON backup format, or a hand-edited dump): every ObjectId became
// a 24-character string and every Date an ISO string, so Mongoose's cast queries
// stopped matching their own rows and logins 500'd on `findById`.
//
// Values are converted only where a model schema declares ObjectId or Date, so a
// text field that merely looks like an id is never rewritten. Idempotent.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BATCH = 500;
const HEX_ID = /^[a-f\d]{24}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:?\d{2})?$/;

const repairDoc = (schema, doc) => {
  let changed = false;

  const fixValue = (value, type) => {
    if (value === null || value === undefined) return value;
    if (type === 'ObjectId') {
      if (typeof value === 'string' && HEX_ID.test(value)) {
        changed = true;
        return new mongoose.Types.ObjectId(value);
      }
      return value;
    }
    if (type === 'Date') {
      if (typeof value === 'string' && ISO_DATE.test(value)) {
        changed = true;
        return new Date(value);
      }
      return value;
    }
    return value;
  };

  const fixSubDoc = (item, subSchema) => {
    if (!item || typeof item !== 'object') return item;
    if (typeof item._id === 'string' && HEX_ID.test(item._id)) {
      item._id = new mongoose.Types.ObjectId(item._id);
      changed = true;
    }
    fixFields(item, subSchema);
    return item;
  };

  function fixFields(obj, sch) {
    for (const [key, value] of Object.entries(obj)) {
      const declared = sch.path(key);
      if (key === '_id' && !declared) {
        if (typeof value === 'string' && HEX_ID.test(value)) {
          obj[key] = new mongoose.Types.ObjectId(value);
          changed = true;
        }
        continue;
      }
      if (!declared) continue; // Mixed / schema-less: leave the bytes alone

      if (declared.instance === 'Array') {
        if (!Array.isArray(value)) continue;
        if (declared.schema) {
          obj[key] = value.map((item) => fixSubDoc(item, declared.schema));
        } else {
          const caster = declared.caster;
          obj[key] = value.map((item) => (caster ? fixValue(item, caster.instance) : item));
        }
        continue;
      }

      if (declared.instance === 'SingleNested' || declared.instance === 'Embedded') {
        if (value && typeof value === 'object') fixSubDoc(value, declared.schema);
        continue;
      }

      obj[key] = fixValue(value, declared.instance);
    }
  }

  if (typeof doc._id === 'string' && HEX_ID.test(doc._id)) {
    doc._id = new mongoose.Types.ObjectId(doc._id);
    changed = true;
  }
  fixFields(doc, schema);
  return { doc, changed };
};

const repairCollection = async (db, model) => {
  const name = model.collection.name;
  const collection = db.collection(name);
  const docs = await collection.find({}).toArray();
  if (!docs.length) return { scanned: 0, rewritten: 0 };

  const repaired = docs.map((doc) => repairDoc(model.schema, doc));
  const changedCount = repaired.filter((r) => r.changed).length;
  if (!changedCount) return { scanned: docs.length, rewritten: 0 };

  // MongoDB will not let an update change `_id`, and repairing ids is the whole
  // point. So the collection is rebuilt under a temporary name and swapped back
  // by rename — the original stays intact until the copy is verified complete.
  const tmpName = `__repair_${name}`;
  const tmp = db.collection(tmpName);
  await tmp.drop().catch(() => {});
  const inserted = await tmp.insertMany(repaired.map((r) => r.doc), { ordered: false }).catch(async (error) => {
    await tmp.drop().catch(() => {});
    throw new Error(`copy failed (${error.writeErrors?.[0]?.errmsg || error.message})`);
  });
  if (inserted.insertedCount !== docs.length) {
    await tmp.drop().catch(() => {});
    throw new Error(`copied ${inserted.insertedCount} of ${docs.length} docs — original left untouched`);
  }

  await collection.drop();
  await tmp.rename(name);
  return { scanned: docs.length, rewritten: changedCount };
};

const loadModels = async () => {
  const modelsDir = path.resolve(HERE, '../src/models');
  for (const file of fs.readdirSync(modelsDir)) {
    if (file.endsWith('.model.js')) await import(pathToFileURL(path.join(modelsDir, file)).href);
  }
};

const run = async () => {
  if (!process.argv.includes('--yes')) {
    console.error('Usage: node scripts/repair-bson-types.mjs --yes');
    console.error('       Converts string ids/dates back to ObjectId/Date using the model schemas.');
    process.exit(1);
  }

  await loadModels();
  const connection = await connectDB();
  const db = connection.connection.db;
  console.log(`Repairing BSON types in ${db.databaseName}`);

  let total = 0;
  for (const model of Object.values(mongoose.models)) {
    try {
      const { scanned, rewritten } = await repairCollection(db, model);
      total += rewritten;
      const label = rewritten ? 'rewritten' : 'clean';
      console.log(`  ${model.collection.name.padEnd(24)} ${String(rewritten).padStart(6)} / ${String(scanned).padStart(6)} (${label})`);
    } catch (error) {
      console.warn(`  ${model.collection.name}: skipped (${error.message})`);
    }
  }

  console.log(`\nDone — ${total} document(s) repaired.`);
  if (total) console.log('Next: npm run ensure-indexes');
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('Repair failed:', error.message);
  process.exitCode = 1;
  await mongoose.disconnect().catch(() => {});
});
