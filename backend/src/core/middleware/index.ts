/**
 * Express Middleware
 *
 * - authMiddleware: verifies JWT, attaches user context
 * - tenantMiddleware: resolves tenant DB and attaches it to the request
 * - superAdminMiddleware: ensures user is a super admin
 */

import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type TokenPayload } from '../auth/jwt.js';
import { resolveTenant, getTenantDb, validateSubscription, validateCompanyActive } from '../tenancy/index.js';
import type { Knex } from 'knex';

// ─── Extend Express Request ─────────────────────────────────

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
      tenantDb?: Knex;
      companyCode?: string;
    }
  }
}

// ─── Auth Middleware ─────────────────────────────────────────

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Missing or invalid authorization header' });
    return;
  }

  try {
    const token = header.split(' ')[1];
    const payload = verifyAccessToken(token);
    req.user = payload;
    req.companyCode = payload.companyCode;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

// ─── Tenant Middleware ───────────────────────────────────────
// Resolves tenant DB, re-validates company active status,
// subscription, and branch on every request.

export function tenantMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  // Super admins don't need tenant resolution (unless they've switched into a company)
  if (req.user.isSuperAdmin && req.user.companyCode === 'system') {
    next();
    return;
  }

  const { companyCode } = req.user;

  (async () => {
    // 1. Re-verify company is still active
    const companyError = await validateCompanyActive(companyCode);
    if (companyError) {
      res.status(401).json({ success: false, message: companyError, code: 'COMPANY_DEACTIVATED' });
      return;
    }

    // 2. Resolve tenant DB connection
    const tenant = await resolveTenant(companyCode);
    if (!tenant) {
      res.status(404).json({ success: false, message: `Company '${companyCode}' not found`, code: 'COMPANY_NOT_FOUND' });
      return;
    }

    // 3. Validate subscription is still active
    const subscriptionError = await validateSubscription(tenant.id);
    if (subscriptionError) {
      res.status(401).json({ success: false, message: subscriptionError, code: 'SUBSCRIPTION_EXPIRED' });
      return;
    }

    // 4. Get tenant DB
    req.tenantDb = getTenantDb(
      tenant.databaseName,
      tenant.databaseHost,
      tenant.databaseUser,
      tenant.databasePassword,
    );

    // 5. Validate branch is still active (if user has a branchId)
    if (req.user!.branchId) {
      const branch = await req.tenantDb('branches').where({ id: req.user!.branchId }).first();
      if (!branch) {
        res.status(401).json({ success: false, message: 'Your assigned branch no longer exists', code: 'BRANCH_NOT_FOUND' });
        return;
      }
      if (!branch.is_active) {
        res.status(401).json({ success: false, message: 'Your assigned branch is inactive', code: 'BRANCH_INACTIVE' });
        return;
      }
    }

    next();
  })().catch(() => {
    res.status(500).json({ success: false, message: 'Failed to resolve tenant' });
  });
}

// ─── Super Admin Guard ───────────────────────────────────────

export function superAdminMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.user?.isSuperAdmin) {
    res.status(403).json({ success: false, message: 'Super Admin access required' });
    return;
  }
  next();
}

// ─── Role Guard ──────────────────────────────────────────────

export function roleMiddleware(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    if (req.user.isSuperAdmin) {
      next();
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
