/**
 * Tenant Database Manager
 *
 * Handles creating, migrating, and seeding new tenant databases
 * when a company is created via the Super Admin panel.
 */

import knex from 'knex';
import bcrypt from 'bcryptjs';
import { config } from '../../config/index.js';
import { getTenantDb } from './tenantConnectionPool.js';

/**
 * Create a new MySQL database for a tenant.
 */
export async function createTenantDatabase(databaseName: string): Promise<void> {
  // Connect without specifying a database
  const rootDb = knex({
    client: 'mysql2',
    connection: {
      host: config.tenantDb.host,
      port: config.tenantDb.port,
      user: config.tenantDb.user,
      password: config.tenantDb.password,
    },
  });

  try {
    await rootDb.raw(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
  } finally {
    await rootDb.destroy();
  }
}

/**
 * Run all tenant database migrations — creates the standard table structure.
 */
export async function runTenantMigrations(databaseName: string): Promise<void> {
  const db = getTenantDb(databaseName);

  // ─── Roles ─────────────────────────────────────────────────
  await db.schema.createTableIfNotExists('roles', (t) => {
    t.increments('id').primary();
    t.string('name', 50).notNullable().unique();
    t.string('display_name', 100).notNullable();
    t.text('description').nullable();
    t.timestamp('created_at').defaultTo(db.fn.now());
    t.timestamp('updated_at').defaultTo(db.fn.now());
  });

  // ─── Permissions ───────────────────────────────────────────
  await db.schema.createTableIfNotExists('permissions', (t) => {
    t.increments('id').primary();
    t.string('name', 100).notNullable().unique();
    t.string('display_name', 150).notNullable();
    t.string('module', 50).notNullable();
    t.timestamp('created_at').defaultTo(db.fn.now());
  });

  // ─── Role Permissions ─────────────────────────────────────
  await db.schema.createTableIfNotExists('role_permissions', (t) => {
    t.increments('id').primary();
    t.integer('role_id').unsigned().notNullable().references('id').inTable('roles').onDelete('CASCADE');
    t.integer('permission_id').unsigned().notNullable().references('id').inTable('permissions').onDelete('CASCADE');
    t.unique(['role_id', 'permission_id']);
  });

  // ─── Branches ──────────────────────────────────────────────
  await db.schema.createTableIfNotExists('branches', (t) => {
    t.increments('id').primary();
    t.string('branch_code', 30).notNullable().unique();
    t.string('branch_name', 150).notNullable();
    t.string('location', 255).nullable();
    t.string('phone', 20).nullable();
    t.string('email', 150).nullable();
    t.boolean('is_active').defaultTo(true);
    t.timestamp('created_at').defaultTo(db.fn.now());
    t.timestamp('updated_at').defaultTo(db.fn.now());
  });

  // ─── Users ─────────────────────────────────────────────────
  await db.schema.createTableIfNotExists('users', (t) => {
    t.increments('id').primary();
    t.string('username', 50).notNullable().unique();
    t.string('email', 150).notNullable().unique();
    t.string('password', 255).notNullable();
    t.string('name', 150).notNullable();
    t.string('avatar', 500).nullable();
    t.integer('role_id').unsigned().nullable().references('id').inTable('roles');
    t.integer('branch_id').unsigned().nullable().references('id').inTable('branches');
    t.enum('status', ['active', 'inactive', 'suspended']).defaultTo('active');
    t.timestamp('last_login').nullable();
    t.timestamp('created_at').defaultTo(db.fn.now());
    t.timestamp('updated_at').defaultTo(db.fn.now());
  });

  // ─── Settings ──────────────────────────────────────────────
  await db.schema.createTableIfNotExists('settings', (t) => {
    t.increments('id').primary();
    t.string('key', 100).notNullable().unique();
    t.text('value').nullable();
    t.string('group', 50).defaultTo('general');
    t.timestamp('updated_at').defaultTo(db.fn.now());
  });

  // ─── Orders ────────────────────────────────────────────────
  await db.schema.createTableIfNotExists('orders', (t) => {
    t.increments('id').primary();
    t.string('order_number', 50).notNullable().unique();
    t.string('buyer', 150).nullable();
    t.string('style', 150).nullable();
    t.integer('quantity').defaultTo(0);
    t.date('delivery_date').nullable();
    t.enum('status', ['pending', 'in_progress', 'completed', 'cancelled']).defaultTo('pending');
    t.integer('branch_id').unsigned().nullable().references('id').inTable('branches');
    t.integer('created_by').unsigned().nullable().references('id').inTable('users');
    t.timestamp('created_at').defaultTo(db.fn.now());
    t.timestamp('updated_at').defaultTo(db.fn.now());
  });

  // ─── Production ────────────────────────────────────────────
  await db.schema.createTableIfNotExists('production', (t) => {
    t.increments('id').primary();
    t.integer('order_id').unsigned().notNullable().references('id').inTable('orders');
    t.integer('branch_id').unsigned().nullable().references('id').inTable('branches');
    t.string('line', 50).nullable();
    t.date('production_date').nullable();
    t.integer('target_qty').defaultTo(0);
    t.integer('produced_qty').defaultTo(0);
    t.integer('defect_qty').defaultTo(0);
    t.timestamp('created_at').defaultTo(db.fn.now());
  });

  // ─── Machines ──────────────────────────────────────────────
  await db.schema.createTableIfNotExists('machines', (t) => {
    t.increments('id').primary();
    t.string('machine_code', 50).notNullable().unique();
    t.string('machine_name', 150).notNullable();
    t.string('type', 50).nullable();
    t.integer('branch_id').unsigned().nullable().references('id').inTable('branches');
    t.enum('status', ['running', 'idle', 'maintenance', 'breakdown']).defaultTo('idle');
    t.timestamp('created_at').defaultTo(db.fn.now());
    t.timestamp('updated_at').defaultTo(db.fn.now());
  });

  // ─── Reports ───────────────────────────────────────────────
  await db.schema.createTableIfNotExists('reports', (t) => {
    t.increments('id').primary();
    t.string('title', 200).notNullable();
    t.string('type', 50).notNullable();
    t.enum('status', ['ready', 'processing', 'error']).defaultTo('processing');
    t.json('parameters').nullable();
    t.string('file_path', 500).nullable();
    t.integer('generated_by').unsigned().nullable().references('id').inTable('users');
    t.integer('branch_id').unsigned().nullable().references('id').inTable('branches');
    t.timestamp('created_at').defaultTo(db.fn.now());
  });
}

/**
 * Seed a tenant database with default roles, permissions, and admin user.
 */
export async function seedTenantDatabase(
  databaseName: string,
  companyCode: string,
  adminPassword: string = 'Admin@123',
): Promise<void> {
  const db = getTenantDb(databaseName);

  // ─── Default Roles ─────────────────────────────────────────
  const defaultRoles = [
    { name: 'company_admin', display_name: 'Company Admin', description: 'Full access to company' },
    { name: 'manager', display_name: 'Manager', description: 'Department-level management' },
    { name: 'planner', display_name: 'Planner', description: 'Production and capacity planning' },
    { name: 'supervisor', display_name: 'Supervisor', description: 'Line / floor supervision' },
    { name: 'operator', display_name: 'Operator', description: 'Basic data entry and operations' },
  ];

  for (const role of defaultRoles) {
    const exists = await db('roles').where({ name: role.name }).first();
    if (!exists) {
      await db('roles').insert(role);
    }
  }

  // ─── Default Permissions ───────────────────────────────────
  const defaultPermissions = [
    { name: 'users.view', display_name: 'View Users', module: 'users' },
    { name: 'users.create', display_name: 'Create Users', module: 'users' },
    { name: 'users.edit', display_name: 'Edit Users', module: 'users' },
    { name: 'users.delete', display_name: 'Delete Users', module: 'users' },
    { name: 'orders.view', display_name: 'View Orders', module: 'orders' },
    { name: 'orders.create', display_name: 'Create Orders', module: 'orders' },
    { name: 'orders.edit', display_name: 'Edit Orders', module: 'orders' },
    { name: 'production.view', display_name: 'View Production', module: 'production' },
    { name: 'production.edit', display_name: 'Edit Production', module: 'production' },
    { name: 'reports.view', display_name: 'View Reports', module: 'reports' },
    { name: 'reports.generate', display_name: 'Generate Reports', module: 'reports' },
    { name: 'settings.view', display_name: 'View Settings', module: 'settings' },
    { name: 'settings.edit', display_name: 'Edit Settings', module: 'settings' },
    { name: 'branches.view', display_name: 'View Branches', module: 'branches' },
    { name: 'branches.manage', display_name: 'Manage Branches', module: 'branches' },
  ];

  for (const perm of defaultPermissions) {
    const exists = await db('permissions').where({ name: perm.name }).first();
    if (!exists) {
      await db('permissions').insert(perm);
    }
  }

  // ─── Default Branch ────────────────────────────────────────
  const branchExists = await db('branches').where({ branch_code: 'hq' }).first();
  if (!branchExists) {
    await db('branches').insert({
      branch_code: 'hq',
      branch_name: 'Head Office',
      location: 'Main Location',
    });
  }

  // ─── Admin User ────────────────────────────────────────────
  const adminRole = await db('roles').where({ name: 'company_admin' }).first();
  const hqBranch = await db('branches').where({ branch_code: 'hq' }).first();
  const adminEmail = `admin@${companyCode}`;
  const adminExists = await db('users').where({ email: adminEmail }).first();

  if (!adminExists) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    await db('users').insert({
      username: 'admin',
      email: adminEmail,
      password: hashedPassword,
      name: 'Company Admin',
      role_id: adminRole?.id ?? null,
      branch_id: hqBranch?.id ?? null,
      status: 'active',
    });
  }
}

/**
 * Full company database provisioning workflow.
 */
export async function provisionCompanyDatabase(
  databaseName: string,
  companyCode: string,
): Promise<void> {
  console.log(`[Tenant] Creating database: ${databaseName}`);
  await createTenantDatabase(databaseName);

  console.log(`[Tenant] Running migrations for: ${databaseName}`);
  await runTenantMigrations(databaseName);

  console.log(`[Tenant] Seeding database: ${databaseName}`);
  await seedTenantDatabase(databaseName, companyCode);

  console.log(`[Tenant] ✅ Provisioned: ${databaseName}`);
}
