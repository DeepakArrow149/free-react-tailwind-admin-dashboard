/**
 * Setup Test Data
 *
 * Creates a test company "acme" with:
 * - Head Office (hq) branch (auto-created by provisioning)
 * - Factory branch
 * - Admin user: admin@acme / Admin@123 (auto-created by provisioning)
 * - Manager user: manager@acme / Admin@123 (in factory branch)
 */

import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';
import { getMasterDb, closeMasterDb } from '../core/database/masterDb.js';
import { provisionCompanyDatabase, getTenantDb, closeTenantDb } from '../core/tenancy/index.js';

async function run() {
  const masterDb = getMasterDb();

  // ─── 1. Create "acme" company in master DB ─────────────────
  const companyCode = 'acme';
  const companyName = 'Acme Corporation';
  const dbName = `${companyCode}_db`;

  const existing = await masterDb('companies').where({ company_code: companyCode }).first();
  if (existing) {
    console.log(`ℹ️  Company '${companyCode}' already exists (id: ${existing.id}). Skipping creation.`);
  } else {
    const [companyId] = await masterDb('companies').insert({
      company_code: companyCode,
      company_name: companyName,
      database_name: dbName,
      database_host: config.tenantDb.host,
      database_user: config.tenantDb.user,
      database_password: config.tenantDb.password,
      status: 'active',
    });

    // Add subscription
    await masterDb('subscriptions').insert({
      company_id: companyId,
      plan: 'standard',
      status: 'active',
      max_users: 50,
      max_branches: 10,
      started_at: masterDb.fn.now(),
    });

    // Provision the tenant database (creates DB, runs migrations, seeds defaults)
    await provisionCompanyDatabase(dbName, companyCode);

    console.log(`✅ Company '${companyName}' created with database '${dbName}'`);
    console.log(`   Default admin: admin@${companyCode} / Admin@123`);
  }

  // ─── 2. Add a second branch "factory" ──────────────────────
  const tenantDb = getTenantDb(dbName);

  const factoryExists = await tenantDb('branches').where({ branch_code: 'factory' }).first();
  if (!factoryExists) {
    await tenantDb('branches').insert({
      branch_code: 'factory',
      branch_name: 'Factory',
      location: 'Industrial Area',
      is_active: true,
    });
    console.log(`✅ Branch 'factory' created`);
  } else {
    console.log(`ℹ️  Branch 'factory' already exists`);
  }

  // ─── 3. Create a manager user in the factory branch ────────
  const factoryBranch = await tenantDb('branches').where({ branch_code: 'factory' }).first();
  const managerRole = await tenantDb('roles').where({ name: 'manager' }).first();
  const managerEmail = `manager@${companyCode}`;

  const managerExists = await tenantDb('users').where({ email: managerEmail }).first();
  if (!managerExists) {
    const hashedPassword = await bcrypt.hash('Admin@123', 12);
    await tenantDb('users').insert({
      username: 'manager',
      email: managerEmail,
      password: hashedPassword,
      name: 'Factory Manager',
      role_id: managerRole?.id ?? null,
      branch_id: factoryBranch?.id ?? null,
      status: 'active',
    });
    console.log(`✅ Manager user created: ${managerEmail} / Admin@123`);
  } else {
    console.log(`ℹ️  Manager user '${managerEmail}' already exists`);
  }

  // ─── Summary ───────────────────────────────────────────────
  console.log(`
  ┌──────────────────────────────────────────────────────┐
  │  Test Data Summary                                   │
  ├──────────────────────────────────────────────────────┤
  │  Super Admin:  superadmin@system / Admin@123         │
  │                                                      │
  │  Company:      Acme Corporation (acme)               │
  │  Database:     acme_db                               │
  │                                                      │
  │  Branches:                                           │
  │    • hq       — Head Office (Main Location)          │
  │    • factory  — Factory (Industrial Area)            │
  │                                                      │
  │  Users:                                              │
  │    • admin@acme   / Admin@123  (company_admin @ hq)  │
  │    • manager@acme / Admin@123  (manager @ factory)   │
  └──────────────────────────────────────────────────────┘
  `);

  await closeTenantDb(dbName);
  await closeMasterDb();
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Setup failed:', err);
  process.exit(1);
});
