/**
 * Company Management Routes (Super Admin only)
 *
 * POST   /api/company/create  — create a new company + provision database
 * GET    /api/company/list    — list all companies
 * GET    /api/company/:id     — get company details
 * PUT    /api/company/:id     — update company
 * PATCH  /api/company/:id/status — suspend / activate company
 * DELETE /api/company/:id     — delete company
 * GET    /api/company/:id/stats — usage statistics
 */

import { Router, type Request, type Response } from 'express';
import { getMasterDb } from '../../core/database/masterDb.js';
import { provisionCompanyDatabase, getTenantDb } from '../../core/tenancy/index.js';
import { authMiddleware, superAdminMiddleware } from '../../core/middleware/index.js';
import { config } from '../../config/index.js';

const router = Router();

// All company routes require super admin
router.use(authMiddleware, superAdminMiddleware);

// ─── POST /api/company/create ────────────────────────────────

router.post('/create', async (req: Request, res: Response) => {
  try {
    const { companyCode, companyName } = req.body;

    if (!companyCode || !companyName) {
      res.status(400).json({ success: false, message: 'companyCode and companyName are required' });
      return;
    }

    const code = companyCode.toLowerCase().trim();
    const dbName = `${code}_db`;
    const masterDb = getMasterDb();

    // Check if company already exists
    const existing = await masterDb('companies').where({ company_code: code }).first();
    if (existing) {
      res.status(409).json({ success: false, message: `Company code '${code}' already exists` });
      return;
    }

    // Register company in master DB
    const [companyId] = await masterDb('companies').insert({
      company_code: code,
      company_name: companyName,
      database_name: dbName,
      database_host: config.tenantDb.host,
      database_user: config.tenantDb.user,
      database_password: config.tenantDb.password,
      status: 'active',
    });

    // Create default subscription
    await masterDb('subscriptions').insert({
      company_id: companyId,
      plan: 'standard',
      status: 'active',
      max_users: 50,
      max_branches: 10,
      started_at: masterDb.fn.now(),
    });

    // Provision tenant database (create DB, run migrations, seed defaults)
    await provisionCompanyDatabase(dbName, code);

    // Fetch the created company
    const company = await masterDb('companies').where({ id: companyId }).first();

    res.status(201).json({
      success: true,
      message: `Company '${companyName}' created successfully with database '${dbName}'`,
      data: {
        id: company.id,
        companyCode: company.company_code,
        companyName: company.company_name,
        databaseName: company.database_name,
        status: company.status,
        defaultAdmin: `admin@${code}`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create company';
    console.error('[Company] Create error:', message);
    res.status(500).json({ success: false, message });
  }
});

// ─── GET /api/company/list ───────────────────────────────────

router.get('/list', async (_req: Request, res: Response) => {
  try {
    const masterDb = getMasterDb();
    const companies = await masterDb('companies')
      .leftJoin('subscriptions', 'companies.id', 'subscriptions.company_id')
      .select(
        'companies.*',
        'subscriptions.plan',
        'subscriptions.status as subscription_status',
        'subscriptions.max_users',
        'subscriptions.max_branches',
      )
      .orderBy('companies.created_at', 'desc');

    res.json({
      success: true,
      data: companies.map((c: Record<string, unknown>) => ({
        id: c.id,
        companyCode: c.company_code,
        companyName: c.company_name,
        databaseName: c.database_name,
        status: c.status,
        plan: c.plan,
        subscriptionStatus: c.subscription_status,
        maxUsers: c.max_users,
        maxBranches: c.max_branches,
        createdAt: c.created_at,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list companies';
    res.status(500).json({ success: false, message });
  }
});

// ─── GET /api/company/:id ────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const masterDb = getMasterDb();
    const company = await masterDb('companies').where({ id: req.params.id }).first();
    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found' });
      return;
    }

    const subscription = await masterDb('subscriptions').where({ company_id: company.id }).first();

    // Get stats from tenant DB
    let userCount = 0;
    let branchCount = 0;
    try {
      const tenantDb = getTenantDb(company.database_name, company.database_host, company.database_user, company.database_password);
      const [{ count: uc }] = await tenantDb('users').count('id as count');
      const [{ count: bc }] = await tenantDb('branches').count('id as count');
      userCount = Number(uc);
      branchCount = Number(bc);
    } catch { /* DB might not exist yet */ }

    res.json({
      success: true,
      data: {
        id: company.id,
        companyCode: company.company_code,
        companyName: company.company_name,
        databaseName: company.database_name,
        status: company.status,
        subscription: subscription
          ? { plan: subscription.plan, status: subscription.status, maxUsers: subscription.max_users, maxBranches: subscription.max_branches }
          : null,
        stats: { userCount, branchCount },
        createdAt: company.created_at,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get company';
    res.status(500).json({ success: false, message });
  }
});

// ─── PUT /api/company/:id ────────────────────────────────────

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { companyName } = req.body;
    const masterDb = getMasterDb();

    await masterDb('companies').where({ id: req.params.id }).update({
      company_name: companyName,
      updated_at: masterDb.fn.now(),
    });

    const company = await masterDb('companies').where({ id: req.params.id }).first();
    res.json({ success: true, data: company });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update company';
    res.status(500).json({ success: false, message });
  }
});

// ─── PATCH /api/company/:id/status ───────────────────────────

router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended', 'inactive'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }
    const masterDb = getMasterDb();
    await masterDb('companies').where({ id: req.params.id }).update({
      status,
      updated_at: masterDb.fn.now(),
    });
    res.json({ success: true, message: `Company status updated to '${status}'` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update status';
    res.status(500).json({ success: false, message });
  }
});

// ─── DELETE /api/company/:id ─────────────────────────────────

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const masterDb = getMasterDb();
    const company = await masterDb('companies').where({ id: req.params.id }).first();
    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found' });
      return;
    }

    // Soft delete: set status to deleted
    await masterDb('companies').where({ id: req.params.id }).update({
      status: 'deleted',
      updated_at: masterDb.fn.now(),
    });
    await masterDb('subscriptions').where({ company_id: req.params.id }).update({ status: 'cancelled' });

    res.json({ success: true, message: `Company '${company.company_name}' deleted` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete company';
    res.status(500).json({ success: false, message });
  }
});

// ─── GET /api/company/:id/stats ──────────────────────────────

router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const masterDb = getMasterDb();
    const company = await masterDb('companies').where({ id: req.params.id }).first();
    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found' });
      return;
    }

    const tenantDb = getTenantDb(company.database_name, company.database_host, company.database_user, company.database_password);
    const [{ count: userCount }] = await tenantDb('users').count('id as count');
    const [{ count: branchCount }] = await tenantDb('branches').count('id as count');
    const [{ count: orderCount }] = await tenantDb('orders').count('id as count');

    res.json({
      success: true,
      data: {
        userCount: Number(userCount),
        branchCount: Number(branchCount),
        orderCount: Number(orderCount),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get stats';
    res.status(500).json({ success: false, message });
  }
});

export default router;
