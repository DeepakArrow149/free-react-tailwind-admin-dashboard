/**
 * Master Database Seed
 *
 * Seeds the super admin user into the master database.
 */

import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';
import { getMasterDb, closeMasterDb } from '../core/database/masterDb.js';

async function run() {
  const db = getMasterDb();

  // Seed super admin
  const existing = await db('super_admin_users')
    .where({ email: config.superAdmin.email })
    .first();

  if (!existing) {
    const hashedPassword = await bcrypt.hash(config.superAdmin.password, 12);
    await db('super_admin_users').insert({
      email: config.superAdmin.email,
      password: hashedPassword,
      name: config.superAdmin.name,
      status: 'active',
    });
    console.log(`✅ Super admin created: ${config.superAdmin.email}`);
  } else {
    console.log(`ℹ️  Super admin already exists: ${config.superAdmin.email}`);
  }

  await closeMasterDb();
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
