/**
 * Backend Environment Configuration
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  masterDb: {
    host: process.env.MASTER_DB_HOST || '127.0.0.1',
    port: parseInt(process.env.MASTER_DB_PORT || '3306', 10),
    user: process.env.MASTER_DB_USER || 'root',
    password: process.env.MASTER_DB_PASSWORD || '',
    database: process.env.MASTER_DB_NAME || 'saas_master',
  },

  tenantDb: {
    host: process.env.TENANT_DB_HOST || '127.0.0.1',
    port: parseInt(process.env.TENANT_DB_PORT || '3306', 10),
    user: process.env.TENANT_DB_USER || 'root',
    password: process.env.TENANT_DB_PASSWORD || '',
  },

  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@system',
    password: process.env.SUPER_ADMIN_PASSWORD || 'Admin@123',
    name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
} as const;
