/**
 * Branch Management Routes (tenant-scoped)
 *
 * POST   /api/branch/create  — create branch
 * GET    /api/branch/list    — list branches
 * PUT    /api/branch/:id     — update branch
 * DELETE /api/branch/:id     — delete branch
 */

import { Router, type Request, type Response } from 'express';
import { authMiddleware, tenantMiddleware, roleMiddleware } from '../../core/middleware/index.js';

const router = Router();

router.use(authMiddleware, tenantMiddleware);

// ─── POST /api/branch/create ─────────────────────────────────

router.post('/create', roleMiddleware('company_admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { branchCode, branchName, location, phone, email } = req.body;
    if (!branchCode || !branchName) {
      res.status(400).json({ success: false, message: 'branchCode and branchName are required' });
      return;
    }

    const db = req.tenantDb!;
    const existing = await db('branches').where({ branch_code: branchCode.toLowerCase() }).first();
    if (existing) {
      res.status(409).json({ success: false, message: `Branch code '${branchCode}' already exists` });
      return;
    }

    const [id] = await db('branches').insert({
      branch_code: branchCode.toLowerCase(),
      branch_name: branchName,
      location: location || null,
      phone: phone || null,
      email: email || null,
    });

    const branch = await db('branches').where({ id }).first();
    res.status(201).json({ success: true, data: branch });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create branch';
    res.status(500).json({ success: false, message });
  }
});

// ─── GET /api/branch/list ────────────────────────────────────

router.get('/list', async (req: Request, res: Response) => {
  try {
    const db = req.tenantDb!;
    const branches = await db('branches').orderBy('branch_name');

    // Count users per branch
    const userCounts = await db('users')
      .select('branch_id')
      .count('id as count')
      .groupBy('branch_id');

    const countMap = new Map(userCounts.map((r: Record<string, unknown>) => [r.branch_id, Number(r.count)]));

    res.json({
      success: true,
      data: branches.map((b: Record<string, unknown>) => ({
        id: b.id,
        branchCode: b.branch_code,
        branchName: b.branch_name,
        location: b.location,
        phone: b.phone,
        email: b.email,
        isActive: b.is_active,
        userCount: countMap.get(b.id) || 0,
        createdAt: b.created_at,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list branches';
    res.status(500).json({ success: false, message });
  }
});

// ─── PUT /api/branch/:id ─────────────────────────────────────

router.put('/:id', roleMiddleware('company_admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { branchName, location, phone, email, isActive } = req.body;
    const db = req.tenantDb!;

    await db('branches').where({ id: req.params.id }).update({
      branch_name: branchName,
      location,
      phone,
      email,
      is_active: isActive,
      updated_at: db.fn.now(),
    });

    const branch = await db('branches').where({ id: req.params.id }).first();
    res.json({ success: true, data: branch });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update branch';
    res.status(500).json({ success: false, message });
  }
});

// ─── DELETE /api/branch/:id ──────────────────────────────────

router.delete('/:id', roleMiddleware('company_admin'), async (req: Request, res: Response) => {
  try {
    const db = req.tenantDb!;
    await db('branches').where({ id: req.params.id }).update({ is_active: false });
    res.json({ success: true, message: 'Branch deactivated' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete branch';
    res.status(500).json({ success: false, message });
  }
});

export default router;
