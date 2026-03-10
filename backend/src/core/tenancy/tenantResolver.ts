/**
 * Tenant Resolver
 *
 * Resolves a tenant from a login email by extracting the company code
 * (the part after @) and looking it up in the master companies table.
 */

import { getMasterDb } from '../database/masterDb.js';

export interface TenantInfo {
  id: number;
  companyCode: string;
  companyName: string;
  databaseName: string;
  databaseHost: string;
  databaseUser: string;
  databasePassword: string;
  status: string;
}

/**
 * Parse an email into username and company code.
 *
 * Examples:
 *   admin@abc → { username: 'admin', companyCode: 'abc' }
 *   superadmin@system → { username: 'superadmin', companyCode: 'system' }
 */
export function parseEmail(email: string): { username: string; companyCode: string } {
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('Invalid email format. Expected: username@companycode');
  }
  return { username: parts[0], companyCode: parts[1] };
}

/**
 * Resolve a tenant from a company code.
 * Queries the master database companies table.
 */
export async function resolveTenant(companyCode: string): Promise<TenantInfo | null> {
  const db = getMasterDb();
  const company = await db('companies')
    .where({ company_code: companyCode, status: 'active' })
    .first();

  if (!company) return null;

  return {
    id: company.id,
    companyCode: company.company_code,
    companyName: company.company_name,
    databaseName: company.database_name,
    databaseHost: company.database_host,
    databaseUser: company.database_user,
    databasePassword: company.database_password,
    status: company.status,
  };
}

/**
 * Check if email belongs to the super admin system tenant.
 */
export function isSuperAdminEmail(companyCode: string): boolean {
  return companyCode === 'system';
}

/**
 * Validate that a company's subscription is active and not expired.
 * Returns null if valid, or an error message string if invalid.
 */
export async function validateSubscription(companyId: number): Promise<string | null> {
  const db = getMasterDb();
  const subscription = await db('subscriptions')
    .where({ company_id: companyId })
    .orderBy('created_at', 'desc')
    .first();

  if (!subscription) {
    return 'No subscription found for this company';
  }

  if (subscription.status !== 'active') {
    return `Company subscription is ${subscription.status}`;
  }

  if (subscription.expires_at && new Date(subscription.expires_at) < new Date()) {
    return 'Company subscription has expired';
  }

  return null; // valid
}

/**
 * Re-verify that a company is still active in the master database.
 * Returns null if active, or an error message string if not.
 */
export async function validateCompanyActive(companyCode: string): Promise<string | null> {
  const db = getMasterDb();
  const company = await db('companies')
    .where({ company_code: companyCode })
    .first();

  if (!company) {
    return `Company '${companyCode}' not found`;
  }

  if (company.status !== 'active') {
    return `Company '${companyCode}' is ${company.status}`;
  }

  return null; // active
}
