/**
 * cleanDatabase.js - Non-interactive version
 * 
 * Keeps admin users (verifyAdmin middleware users).
 * Wipes all other data.
 * 
 * Run: node cleanDatabase.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const DB_URI = process.env.DB_URI || 'mongodb://127.0.0.1:27017/constructops_dev';

const COLLECTIONS_TO_WIPE = [
  'companies',
  'projects',
  'workers',
  'expenses',
  'materials',
  'materiallogs',
  'dailyreports',
  'alerts',
  'projectassignments',
  'contracts',
  'payments',
  'subscriptionpayments',
  'attendances',
];

async function run() {
  try {
    await mongoose.connect(DB_URI);
    console.log('\n✅ Connected to MongoDB:', DB_URI);

    const db = mongoose.connection.db;
    const usersCol = db.collection('users');

    // Show all users before wiping
    const allUsers = await usersCol.find({}, { projection: { email: 1, role: 1, name: 1 } }).toArray();
    console.log('\n📋 All users in database:');
    allUsers.forEach((u) => console.log(`   → ${u.email} | role: ${u.role} | name: ${u.name}`));

    // Find system admin (isAdmin flag or role === 'admin')
    const adminUsers = await usersCol.find({ 
      $or: [{ isAdmin: true }, { role: 'admin' }] 
    }).toArray();

    // If no admin flag found, ask which emails to keep via env or keep none
    const keepEmails = adminUsers.map((a) => a.email);
    
    console.log('\n🛡️  Users to KEEP (admin):');
    if (keepEmails.length === 0) {
      console.log('   ⚠️  None found with role=admin or isAdmin=true');
      console.log('   → All users will be deleted');
    } else {
      keepEmails.forEach((e) => console.log(`   → ${e}`));
    }

    console.log('\n🗑️  Wiping all collections...\n');

    // 1. Wipe all collections
    for (const col of COLLECTIONS_TO_WIPE) {
      try {
        const result = await db.collection(col).deleteMany({});
        console.log(`   ✓ ${col}: ${result.deletedCount} deleted`);
      } catch (err) {
        console.log(`   ⚠️  ${col}: skipped (${err.message})`);
      }
    }

    // 2. Delete all non-admin users
    const deleteQuery = keepEmails.length > 0
      ? { email: { $nin: keepEmails } }
      : {};
    const nonAdminResult = await usersCol.deleteMany(deleteQuery);
    console.log(`   ✓ users (non-admin): ${nonAdminResult.deletedCount} deleted`);

    // 3. Clean up admin user — remove companyId so they can log in fresh
    if (keepEmails.length > 0) {
      await usersCol.updateMany(
        { email: { $in: keepEmails } },
        { $set: { status: 'active' }, $unset: { companyId: '' } }
      );
      console.log(`   ✓ admin user(s) cleaned (companyId cleared, status=active)`);
    }

    console.log('\n✅ Database cleaned successfully!');
    console.log('   Remaining documents in users collection:');
    const remaining = await usersCol.find({}, { projection: { email: 1, role: 1 } }).toArray();
    remaining.forEach((u) => console.log(`   → ${u.email} | role: ${u.role}`));
    console.log('');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
