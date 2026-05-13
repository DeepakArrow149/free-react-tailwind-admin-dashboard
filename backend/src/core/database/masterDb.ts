/**
 * Master Database Connection
 * Connects to the global SaaS master database that stores company registry,
 * subscriptions, super admin users, and branch structures.
 */

import knex, { type Knex } from 'knex';
import { config } from '../../config/index.js';

let masterKnex: Knex | null = null;

export function getMasterDb(): Knex {
  if (!masterKnex) {
    masterKnex = knex({
      client: 'mysql2',
      connection: {
        host: config.masterDb.host,
        port: config.masterDb.port,
        user: config.masterDb.user,
        password: config.masterDb.password,
        database: config.masterDb.database,
      },
      pool: { min: 2, max: 10 },
    });
  }
  return masterKnex;
}

export async function closeMasterDb(): Promise<void> {
  if (masterKnex) {
    await masterKnex.destroy();
    masterKnex = null;
  }
}
