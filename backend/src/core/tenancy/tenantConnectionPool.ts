/**
 * Tenant Database Connection Pool
 *
 * Manages a pool of Knex connections — one per tenant company.
 * Connections are cached and reused. Idle connections are closed after a timeout.
 */

import knex, { type Knex } from 'knex';
import { config } from '../../config/index.js';

interface CachedConnection {
  db: Knex;
  lastUsed: number;
}

const connectionCache = new Map<string, CachedConnection>();
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Get a Knex connection for a specific tenant database.
 */
export function getTenantDb(
  databaseName: string,
  host?: string,
  user?: string,
  password?: string,
): Knex {
  const cacheKey = `${host || config.tenantDb.host}:${databaseName}`;

  const cached = connectionCache.get(cacheKey);
  if (cached) {
    cached.lastUsed = Date.now();
    return cached.db;
  }

  const db = knex({
    client: 'mysql2',
    connection: {
      host: host || config.tenantDb.host,
      port: config.tenantDb.port,
      user: user || config.tenantDb.user,
      password: password || config.tenantDb.password,
      database: databaseName,
    },
    pool: { min: 1, max: 5 },
  });

  connectionCache.set(cacheKey, { db, lastUsed: Date.now() });
  return db;
}

/**
 * Close a specific tenant connection.
 */
export async function closeTenantDb(databaseName: string): Promise<void> {
  for (const [key, cached] of connectionCache.entries()) {
    if (key.endsWith(`:${databaseName}`)) {
      await cached.db.destroy();
      connectionCache.delete(key);
    }
  }
}

/**
 * Close all idle connections (run periodically).
 */
export async function cleanupIdleConnections(): Promise<void> {
  const now = Date.now();
  for (const [key, cached] of connectionCache.entries()) {
    if (now - cached.lastUsed > IDLE_TIMEOUT_MS) {
      await cached.db.destroy();
      connectionCache.delete(key);
    }
  }
}

/**
 * Close all tenant connections (shutdown).
 */
export async function closeAllTenantDbs(): Promise<void> {
  for (const [key, cached] of connectionCache.entries()) {
    await cached.db.destroy();
    connectionCache.delete(key);
  }
}

// Cleanup idle connections every 10 minutes
setInterval(cleanupIdleConnections, 10 * 60 * 1000);
