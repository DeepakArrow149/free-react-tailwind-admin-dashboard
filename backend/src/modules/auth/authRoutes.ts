/**
 * Auth Routes
 *
 * POST /api/auth/login          — multi-tenant login (email-based resolution)
 * POST /api/auth/refresh        — refresh JWT token
 * GET  /api/auth/me             — get current user context
 * GET  /api/auth/validate       — validate session (route service provider)
 * POST /api/auth/switch-branch  — switch branch within same company
 * POST /api/auth/switch-company — super admin: impersonate a company
 * POST /api/auth/exit-company   — super admin: return to system context
 */

import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import {
  parseEmail,
  resolveTenant,
  isSuperAdminEmail,
  getTenantDb,
  validateSubscription,
} from '../../core/tenancy/index.js';
import { getMasterDb } from '../../core/database/masterDb.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../core/auth/jwt.js';
import { authMiddleware, tenantMiddleware, superAdminMiddleware } from '../../core/middleware/index.js';

const router = Router();

// ─── POST /api/auth/login ────────────────────────────────────

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }

    const { companyCode } = parseEmail(email);

    // ── Super Admin Login ──────────────────────────────────
    if (isSuperAdminEmail(companyCode)) {
      const masterDb = getMasterDb();
      const admin = await masterDb('super_admin_users')
        .where({ email: email.toLowerCase(), status: 'active' })
        .first();

      if (!admin) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }

      const validPassword = await bcrypt.compare(password, admin.password);
      if (!validPassword) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }

      const tokenPayload = {
        userId: admin.id,
        email: admin.email,
        name: admin.name,
        role: 'super_admin',
        companyCode: 'system',
        isSuperAdmin: true,
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      res.json({
        success: true,
        data: {
          accessToken,
          refreshToken,
          user: {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: 'super_admin',
            companyCode: 'system',
            isSuperAdmin: true,
          },
        },
      });
      return;
    }

    // ── Tenant Login ───────────────────────────────────────
    const tenant = await resolveTenant(companyCode);
    if (!tenant) {
      res.status(404).json({ success: false, message: `Company '${companyCode}' not found or inactive` });
      return;
    }

    // Validate subscription
    const subscriptionError = await validateSubscription(tenant.id);
    if (subscriptionError) {
      res.status(403).json({ success: false, message: subscriptionError, code: 'SUBSCRIPTION_INVALID' });
      return;
    }

    const tenantDb = getTenantDb(
      tenant.databaseName,
      tenant.databaseHost,
      tenant.databaseUser,
      tenant.databasePassword,
    );

    const user = await tenantDb('users')
      .where({ email: email.toLowerCase(), status: 'active' })
      .first();

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    // Validate branch exists and is active
    let branch = null;
    if (user.branch_id) {
      branch = await tenantDb('branches').where({ id: user.branch_id }).first();
      if (!branch) {
        res.status(403).json({
          success: false,
          message: 'Your assigned branch does not exist. Contact your administrator.',
          code: 'BRANCH_NOT_FOUND',
        });
        return;
      }
      if (!branch.is_active) {
        res.status(403).json({
          success: false,
          message: 'Your assigned branch is inactive. Contact your administrator.',
          code: 'BRANCH_INACTIVE',
        });
        return;
      }
    }

    // Get role name
    const role = user.role_id
      ? await tenantDb('roles').where({ id: user.role_id }).first()
      : null;

    // Update last_login
    await tenantDb('users').where({ id: user.id }).update({ last_login: tenantDb.fn.now() });

    // Get all active branches for this company
    const availableBranches = await tenantDb('branches')
      .where({ is_active: true })
      .select('id', 'branch_code', 'branch_name', 'location');

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: role?.name || 'operator',
      companyCode,
      companyId: tenant.id,
      branchId: user.branch_id,
      branchName: branch?.branch_name || null,
      branchCode: branch?.branch_code || null,
      isSuperAdmin: false,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: role?.name || 'operator',
          roleName: role?.display_name || 'Operator',
          companyCode,
          companyName: tenant.companyName,
          branchId: user.branch_id,
          branchName: branch?.branch_name || null,
          branchCode: branch?.branch_code || null,
        },
        availableBranches,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    console.error('[Auth] Login error:', message);
    res.status(500).json({ success: false, message });
  }
});

// ─── POST /api/auth/refresh ──────────────────────────────────

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ success: false, message: 'Refresh token required' });
      return;
    }
    const payload = verifyRefreshToken(refreshToken);
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    res.json({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
});

// ─── GET /api/auth/me ────────────────────────────────────────

router.get('/me', authMiddleware, tenantMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    if (req.user.isSuperAdmin) {
      res.json({ success: true, data: { user: req.user } });
      return;
    }

    const user = await req.tenantDb!('users').where({ id: req.user.userId }).first();
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const role = user.role_id
      ? await req.tenantDb!('roles').where({ id: user.role_id }).first()
      : null;
    const branch = user.branch_id
      ? await req.tenantDb!('branches').where({ id: user.branch_id }).first()
      : null;

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: role?.name || 'operator',
          roleName: role?.display_name || 'Operator',
          companyCode: req.user.companyCode,
          branchId: user.branch_id,
          branchName: branch?.branch_name || null,
        },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get user';
    res.status(500).json({ success: false, message });
  }
});

// ─── GET /api/auth/validate ──────────────────────────────────
// "Route service provider" — validates the full session on page load.
// tenantMiddleware already re-checks company, subscription, and branch.

router.get('/validate', authMiddleware, tenantMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ valid: false, reason: 'Not authenticated' });
      return;
    }

    // Super admin in system context — just valid
    if (req.user.isSuperAdmin && req.user.companyCode === 'system') {
      res.json({
        valid: true,
        user: req.user,
        company: null,
        branch: null,
        availableBranches: [],
      });
      return;
    }

    // Tenant user (or super admin impersonating) — fetch full context
    const user = await req.tenantDb!('users').where({ id: req.user.userId }).first();
    if (!user || user.status !== 'active') {
      res.status(401).json({ valid: false, reason: 'User account is inactive or not found', code: 'USER_INACTIVE' });
      return;
    }

    const role = user.role_id
      ? await req.tenantDb!('roles').where({ id: user.role_id }).first()
      : null;
    const branch = user.branch_id
      ? await req.tenantDb!('branches').where({ id: user.branch_id }).first()
      : null;
    const availableBranches = await req.tenantDb!('branches')
      .where({ is_active: true })
      .select('id', 'branch_code', 'branch_name', 'location');

    // Get company info from master
    const masterDb = getMasterDb();
    const company = await masterDb('companies')
      .where({ company_code: req.user.companyCode })
      .first();

    res.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: role?.name || 'operator',
        roleName: role?.display_name || 'Operator',
        companyCode: req.user.companyCode,
        companyName: company?.company_name || '',
        branchId: user.branch_id,
        branchName: branch?.branch_name || null,
        branchCode: branch?.branch_code || null,
        isSuperAdmin: req.user.isSuperAdmin || false,
      },
      company: company
        ? { id: company.id, companyCode: company.company_code, companyName: company.company_name }
        : null,
      branch: branch
        ? { id: branch.id, branchCode: branch.branch_code, branchName: branch.branch_name, location: branch.location }
        : null,
      availableBranches,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Validation failed';
    res.status(500).json({ valid: false, reason: message });
  }
});

// ─── POST /api/auth/switch-branch ────────────────────────────
// Switch to a different branch within the same company. Issues a new JWT.

router.post('/switch-branch', authMiddleware, tenantMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.tenantDb) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { branchId } = req.body;
    if (!branchId) {
      res.status(400).json({ success: false, message: 'branchId is required' });
      return;
    }

    // Verify target branch exists and is active
    const branch = await req.tenantDb('branches').where({ id: branchId }).first();
    if (!branch) {
      res.status(404).json({ success: false, message: 'Branch not found' });
      return;
    }
    if (!branch.is_active) {
      res.status(403).json({ success: false, message: 'Target branch is inactive' });
      return;
    }

    // Role-based: only company_admin and manager can switch to any branch
    const allowedRoles = ['company_admin', 'manager'];
    if (!req.user.isSuperAdmin && !allowedRoles.includes(req.user.role)) {
      // Regular users can only access their assigned branch
      const user = await req.tenantDb('users').where({ id: req.user.userId }).first();
      if (user?.branch_id !== branchId) {
        res.status(403).json({ success: false, message: 'You do not have permission to switch to this branch' });
        return;
      }
    }

    // Issue new JWT with updated branch
    const tokenPayload = {
      ...req.user,
      branchId: branch.id,
      branchName: branch.branch_name,
      branchCode: branch.branch_code,
    };

    // Remove JWT-specific fields that get re-added by sign
    delete (tokenPayload as Record<string, unknown>).iat;
    delete (tokenPayload as Record<string, unknown>).exp;

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Get company info
    const masterDb = getMasterDb();
    const company = await masterDb('companies')
      .where({ company_code: req.user.companyCode })
      .first();

    const user = await req.tenantDb('users').where({ id: req.user.userId }).first();
    const role = user?.role_id
      ? await req.tenantDb('roles').where({ id: user.role_id }).first()
      : null;

    const availableBranches = await req.tenantDb('branches')
      .where({ is_active: true })
      .select('id', 'branch_code', 'branch_name', 'location');

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: req.user.userId,
          email: req.user.email,
          name: req.user.name,
          avatar: user?.avatar,
          role: req.user.role,
          roleName: role?.display_name || 'Operator',
          companyCode: req.user.companyCode,
          companyName: company?.company_name || '',
          branchId: branch.id,
          branchName: branch.branch_name,
          branchCode: branch.branch_code,
          isSuperAdmin: req.user.isSuperAdmin || false,
        },
        availableBranches,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to switch branch';
    res.status(500).json({ success: false, message });
  }
});

// ─── POST /api/auth/switch-company ───────────────────────────
// Super admin only: impersonate a company's database.

router.post('/switch-company', authMiddleware, superAdminMiddleware, async (req: Request, res: Response) => {
  try {
    const { companyCode } = req.body;
    if (!companyCode) {
      res.status(400).json({ success: false, message: 'companyCode is required' });
      return;
    }

    // Resolve the target company
    const tenant = await resolveTenant(companyCode);
    if (!tenant) {
      res.status(404).json({ success: false, message: `Company '${companyCode}' not found or inactive` });
      return;
    }

    // Connect to tenant DB
    const tenantDb = getTenantDb(
      tenant.databaseName,
      tenant.databaseHost,
      tenant.databaseUser,
      tenant.databasePassword,
    );

    // Get the default branch (hq or first active)
    const defaultBranch = await tenantDb('branches')
      .where({ is_active: true })
      .orderByRaw("CASE WHEN branch_code = 'hq' THEN 0 ELSE 1 END")
      .first();

    // Get all active branches
    const availableBranches = await tenantDb('branches')
      .where({ is_active: true })
      .select('id', 'branch_code', 'branch_name', 'location');

    // Issue new JWT scoped to this company
    const tokenPayload = {
      userId: req.user!.userId,
      email: req.user!.email,
      name: req.user!.name,
      role: 'super_admin',
      companyCode,
      companyId: tenant.id,
      branchId: defaultBranch?.id || undefined,
      branchName: defaultBranch?.branch_name || null,
      branchCode: defaultBranch?.branch_code || null,
      isSuperAdmin: true,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: req.user!.userId,
          email: req.user!.email,
          name: req.user!.name,
          role: 'super_admin',
          companyCode,
          companyName: tenant.companyName,
          branchId: defaultBranch?.id || null,
          branchName: defaultBranch?.branch_name || null,
          branchCode: defaultBranch?.branch_code || null,
          isSuperAdmin: true,
        },
        availableBranches,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to switch company';
    res.status(500).json({ success: false, message });
  }
});

// ─── POST /api/auth/exit-company ─────────────────────────────
// Super admin only: return to system context.

router.post('/exit-company', authMiddleware, superAdminMiddleware, async (req: Request, res: Response) => {
  try {
    const tokenPayload = {
      userId: req.user!.userId,
      email: req.user!.email,
      name: req.user!.name,
      role: 'super_admin',
      companyCode: 'system',
      isSuperAdmin: true,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: req.user!.userId,
          email: req.user!.email,
          name: req.user!.name,
          role: 'super_admin',
          companyCode: 'system',
          isSuperAdmin: true,
        },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to exit company';
    res.status(500).json({ success: false, message });
  }
});

export default router;
