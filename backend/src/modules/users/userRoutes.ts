/**
 * User Management Routes (tenant-scoped)
 *
 * GET    /api/users         — list users
 * POST   /api/users/create  — create user
 * GET    /api/users/:id     — get user details
 * PUT    /api/users/:id     — update user
 * PATCH  /api/users/:id/status — change status
 */

import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { authMiddleware, tenantMiddleware, roleMiddleware } from '../../core/middleware/index.js';

const router = Router();

router.use(authMiddleware, tenantMiddleware);

// ─── GET /api/users ──────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  try {
    const db = req.tenantDb!;
    const { branch_id, role_id, search, page = '1', limit = '25' } = req.query;

    let query = db('users')
      .leftJoin('roles', 'users.role_id', 'roles.id')
      .leftJoin('branches', 'users.branch_id', 'branches.id')
      .select(
        'users.id', 'users.username', 'users.email', 'users.name', 'users.avatar',
        'users.status', 'users.last_login', 'users.created_at',
        'roles.name as role_name', 'roles.display_name as role_display',
        'branches.branch_name', 'branches.branch_code',
        'users.role_id', 'users.branch_id',
      );

    // Non-admin users can only see users in their own branch
    if (req.user?.role !== 'company_admin' && req.user?.branchId) {
      query = query.where('users.branch_id', req.user.branchId);
    }

    if (branch_id) query = query.where('users.branch_id', branch_id);
    if (role_id) query = query.where('users.role_id', role_id);
    if (search) {
      query = query.where((qb) => {
        qb.where('users.name', 'like', `%${search}%`)
          .orWhere('users.email', 'like', `%${search}%`)
          .orWhere('users.username', 'like', `%${search}%`);
      });
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    const [{ count: total }] = await query.clone().clearSelect().count('users.id as count');
    const users = await query.orderBy('users.created_at', 'desc').limit(limitNum).offset(offset);

    res.json({
      success: true,
      data: users.map((u: Record<string, unknown>) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        name: u.name,
        avatar: u.avatar,
        status: u.status,
        role: u.role_name,
        roleDisplay: u.role_display,
        roleId: u.role_id,
        branchId: u.branch_id,
        branchName: u.branch_name,
        branchCode: u.branch_code,
        lastLogin: u.last_login,
        createdAt: u.created_at,
      })),
      meta: {
        currentPage: pageNum,
        perPage: limitNum,
        total: Number(total),
        lastPage: Math.ceil(Number(total) / limitNum),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list users';
    res.status(500).json({ success: false, message });
  }
});

// ─── POST /api/users/create ──────────────────────────────────

router.post('/create', roleMiddleware('company_admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { username, email, password, name, roleId, branchId } = req.body;
    if (!username || !email || !password || !name) {
      res.status(400).json({ success: false, message: 'username, email, password, and name are required' });
      return;
    }

    const db = req.tenantDb!;

    // Check existing
    const existing = await db('users')
      .where({ email: email.toLowerCase() })
      .orWhere({ username: username.toLowerCase() })
      .first();
    if (existing) {
      res.status(409).json({ success: false, message: 'Username or email already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [id] = await db('users').insert({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role_id: roleId || null,
      branch_id: branchId || null,
      status: 'active',
    });

    const user = await db('users')
      .leftJoin('roles', 'users.role_id', 'roles.id')
      .leftJoin('branches', 'users.branch_id', 'branches.id')
      .select('users.*', 'roles.display_name as role_display', 'branches.branch_name')
      .where('users.id', id)
      .first();

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role_display,
        branch: user.branch_name,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create user';
    res.status(500).json({ success: false, message });
  }
});

// ─── GET /api/users/roles/list ───────────────────────────────
// NOTE: Must be defined BEFORE /:id to avoid Express matching 'roles' as an :id param

router.get('/roles/list', async (req: Request, res: Response) => {
  try {
    const db = req.tenantDb!;
    const roles = await db('roles').orderBy('name');
    res.json({ success: true, data: roles });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list roles';
    res.status(500).json({ success: false, message });
  }
});

// ─── GET /api/users/:id ──────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = req.tenantDb!;
    const user = await db('users')
      .leftJoin('roles', 'users.role_id', 'roles.id')
      .leftJoin('branches', 'users.branch_id', 'branches.id')
      .select(
        'users.*',
        'roles.name as role_name', 'roles.display_name as role_display',
        'branches.branch_name', 'branches.branch_code',
      )
      .where('users.id', req.params.id)
      .first();

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        status: user.status,
        role: user.role_name,
        roleDisplay: user.role_display,
        roleId: user.role_id,
        branchId: user.branch_id,
        branchName: user.branch_name,
        branchCode: user.branch_code,
        lastLogin: user.last_login,
        createdAt: user.created_at,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get user';
    res.status(500).json({ success: false, message });
  }
});

// ─── PUT /api/users/:id ──────────────────────────────────────

router.put('/:id', roleMiddleware('company_admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { name, roleId, branchId, password } = req.body;
    const db = req.tenantDb!;

    const updates: Record<string, unknown> = {
      name,
      role_id: roleId || null,
      branch_id: branchId || null,
      updated_at: db.fn.now(),
    };

    if (password) {
      updates.password = await bcrypt.hash(password, 12);
    }

    await db('users').where({ id: req.params.id }).update(updates);
    res.json({ success: true, message: 'User updated' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update user';
    res.status(500).json({ success: false, message });
  }
});

// ─── PATCH /api/users/:id/status ─────────────────────────────

router.patch('/:id/status', roleMiddleware('company_admin'), async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }

    const db = req.tenantDb!;
    await db('users').where({ id: req.params.id }).update({ status, updated_at: db.fn.now() });
    res.json({ success: true, message: `User status updated to '${status}'` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update status';
    res.status(500).json({ success: false, message });
  }
});

export default router;
