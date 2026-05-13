/**
 * Master Database Migration
 *
 * Creates the global system tables in the master database:
 * - super_admin_users
 * - companies
 * - subscriptions
 * - company_branches (global view)
 */

import knex from 'knex';
import { config } from '../config/index.js';
import { getMasterDb, closeMasterDb } from '../core/database/masterDb.js';

async function run() {
  // First ensure the master database exists
  const rootDb = knex({
    client: 'mysql2',
    connection: {
      host: config.masterDb.host,
      port: config.masterDb.port,
      user: config.masterDb.user,
      password: config.masterDb.password,
    },
  });

  await rootDb.raw(`CREATE DATABASE IF NOT EXISTS \`${config.masterDb.database}\``);
  await rootDb.destroy();

  const db = getMasterDb();

  // ─── Super Admin Users ─────────────────────────────────────
  await db.schema.createTableIfNotExists('super_admin_users', (t) => {
    t.increments('id').primary();
    t.string('email', 150).notNullable().unique();
    t.string('password', 255).notNullable();
    t.string('name', 150).notNullable();
    t.enum('status', ['active', 'inactive']).defaultTo('active');
    t.timestamp('created_at').defaultTo(db.fn.now());
    t.timestamp('updated_at').defaultTo(db.fn.now());
  });

  // ─── Companies ─────────────────────────────────────────────
  await db.schema.createTableIfNotExists('companies', (t) => {
    t.increments('id').primary();
    t.string('company_code', 30).notNullable().unique();
    t.string('company_name', 200).notNullable();
    t.string('database_name', 100).notNullable();
    t.string('database_host', 255).defaultTo('127.0.0.1');
    t.string('database_user', 100).defaultTo('root');
    t.string('database_password', 255).defaultTo('');
    t.enum('status', ['active', 'suspended', 'inactive', 'deleted']).defaultTo('active');
    t.timestamp('created_at').defaultTo(db.fn.now());
    t.timestamp('updated_at').defaultTo(db.fn.now());
  });

  // ─── Subscriptions ─────────────────────────────────────────
  await db.schema.createTableIfNotExists('subscriptions', (t) => {
    t.increments('id').primary();
    t.integer('company_id').unsigned().notNullable().references('id').inTable('companies').onDelete('CASCADE');
    t.enum('plan', ['free', 'standard', 'enterprise']).defaultTo('standard');
    t.enum('status', ['active', 'expired', 'cancelled']).defaultTo('active');
    t.integer('max_users').defaultTo(50);
    t.integer('max_branches').defaultTo(10);
    t.timestamp('started_at').defaultTo(db.fn.now());
    t.timestamp('expires_at').nullable();
    t.timestamp('created_at').defaultTo(db.fn.now());
  });

  // ─── Company Branches (master-level view) ──────────────────
  await db.schema.createTableIfNotExists('company_branches', (t) => {
    t.increments('id').primary();
    t.integer('company_id').unsigned().notNullable().references('id').inTable('companies').onDelete('CASCADE');
    t.string('branch_code', 30).notNullable();
    t.string('branch_name', 150).notNullable();
    t.string('location', 255).nullable();
    t.boolean('is_active').defaultTo(true);
    t.timestamp('created_at').defaultTo(db.fn.now());
    t.unique(['company_id', 'branch_code']);
  });

  console.log('✅ Master database migration complete.');
  await closeMasterDb();
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
