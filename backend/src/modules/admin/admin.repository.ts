import { prisma } from '../../config';
import {
  IAdminRepository,
  DashboardStats,
  TrendItem,
  RecentActivity,
  AdminUserListOptions,
  AdminUserItem,
  AdminUserDetail,
  AdminSettingItem,
  UpsertSettingInput,
  AuditLogListOptions,
  AuditLogItem,
  CreateAuditLogInput,
  OwnerOversightListOptions,
  OwnerProjectItem,
  OwnerSystemHealth,
  OwnerWorkspaceItem,
  MaintenanceResult,
} from './admin.interface';

export class AdminRepository implements IAdminRepository {
  // -------------------------------------------------------------------------
  // Dashboard
  // -------------------------------------------------------------------------

  async getDashboardStats(): Promise<DashboardStats> {
    const [
      totalUsers,
      totalWorkspaces,
      totalProjects,
      totalTasks,
      blockedUsers,
      overdueTasks,
      emailSettings,
    ] =
      await Promise.all([
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.workspace.count({ where: { deletedAt: null } }),
        prisma.project.count({ where: { deletedAt: null } }),
        prisma.task.count({ where: { deletedAt: null } }),
        prisma.user.count({ where: { isBlocked: true, deletedAt: null } }),
        prisma.task.count({
          where: {
            deletedAt: null,
            dueDate: { lt: new Date() },
            status: { not: 'DONE' },
          },
        }),
        prisma.systemSetting.findMany({
          where: {
            key: {
              in: [
                'smtp_user',
                'smtp_pass',
                'smtp_from',
                'google_client_id',
                'google_client_secret',
                'gmail_refresh_token',
              ],
            },
          },
          select: { key: true, value: true },
        }),
      ]);

    const settingMap = new Map(emailSettings.map((setting) => [setting.key, setting.value.trim()]));
    const emailConfigured = Boolean(
      (settingMap.get('smtp_user') || process.env.EMAIL_USER) &&
      (settingMap.get('smtp_pass') || process.env.EMAIL_PASS) &&
      (settingMap.get('smtp_from') || process.env.EMAIL_FROM || settingMap.get('smtp_user') || process.env.EMAIL_USER),
    );
    const gmailApiConfigured = Boolean(
      (settingMap.get('google_client_id') || process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID) &&
      (settingMap.get('google_client_secret') || process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET) &&
      (settingMap.get('gmail_refresh_token') || process.env.GMAIL_REFRESH_TOKEN),
    );

    return {
      totalUsers,
      totalWorkspaces,
      totalProjects,
      totalTasks,
      blockedUsers,
      overdueTasks,
      emailConfigured,
      gmailApiConfigured,
    };
  }

  async getRegistrationTrend(months: number): Promise<TrendItem[]> {
    const since = new Date();
    since.setMonth(since.getMonth() - months);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    // Raw query for monthly grouping (MySQL DATE_FORMAT)
    const userTrend = await prisma.$queryRaw<{ month: string; count: bigint }[]>`
      SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
      FROM users
      WHERE created_at >= ${since} AND deleted_at IS NULL
      GROUP BY month
      ORDER BY month ASC
    `;

    const workspaceTrend = await prisma.$queryRaw<{ month: string; count: bigint }[]>`
      SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
      FROM workspaces
      WHERE created_at >= ${since} AND deleted_at IS NULL
      GROUP BY month
      ORDER BY month ASC
    `;

    // Merge into TrendItem[]
    const userMap = new Map(userTrend.map((r) => [r.month, Number(r.count)]));
    const wsMap = new Map(workspaceTrend.map((r) => [r.month, Number(r.count)]));

    const allMonths = new Set([...userMap.keys(), ...wsMap.keys()]);
    const result: TrendItem[] = [];

    // Fill in all months in range
    const cursor = new Date(since);
    const now = new Date();
    while (cursor <= now) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      allMonths.add(key);
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const sorted = [...allMonths].sort();
    for (const month of sorted) {
      result.push({
        month,
        users: userMap.get(month) ?? 0,
        workspaces: wsMap.get(month) ?? 0,
      });
    }

    return result;
  }

  async getRecentSystemActivity(limit: number): Promise<RecentActivity[]> {
    const [recentUsers, recentWorkspaces] = await Promise.all([
      prisma.user.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, name: true, email: true, createdAt: true },
      }),
      prisma.workspace.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, name: true, createdAt: true },
      }),
    ]);

    const activities: RecentActivity[] = [
      ...recentUsers.map((u) => ({
        id: u.id,
        type: 'USER_REGISTERED' as const,
        description: `${u.name} (${u.email}) đã đăng ký`,
        createdAt: u.createdAt,
      })),
      ...recentWorkspaces.map((w) => ({
        id: w.id,
        type: 'WORKSPACE_CREATED' as const,
        description: `Workspace "${w.name}" được tạo`,
        createdAt: w.createdAt,
      })),
    ];

    // Sort by newest first, take limit
    activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return activities.slice(0, limit);
  }

  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------

  async getUsers(
    options: AdminUserListOptions,
  ): Promise<{ data: AdminUserItem[]; total: number }> {
    const where: Record<string, unknown> = { deletedAt: null };

    if (options.search) {
      where.OR = [
        { email: { contains: options.search } },
        { name: { contains: options.search } },
      ];
    }

    if (options.status === 'blocked') {
      where.isBlocked = true;
    } else if (options.status === 'active') {
      where.isBlocked = false;
    }

    if (options.role) {
      where.systemRole = options.role;
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where: where as never,
        orderBy: { createdAt: 'desc' },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          systemRole: true,
          isBlocked: true,
          createdAt: true,
          _count: { select: { memberships: true } },
        },
      }),
      prisma.user.count({ where: where as never }),
    ]);

    return { data: data as AdminUserItem[], total };
  }

  async getUserDetail(userId: number): Promise<AdminUserDetail | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        systemRole: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          where: { deletedAt: null },
          select: {
            role: true,
            workspace: {
              select: { id: true, name: true },
            },
          },
        },
        projectMembers: {
          where: { deletedAt: null },
          select: {
            role: true,
            project: {
              select: {
                id: true,
                name: true,
                key: true,
                workspace: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      bio: user.bio,
      systemRole: user.systemRole,
      isBlocked: user.isBlocked,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      workspaces: user.memberships.map((m) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        role: m.role,
      })),
      projects: user.projectMembers.map((m) => ({
        id: m.project.id,
        name: m.project.name,
        key: m.project.key,
        role: m.role,
        workspaceName: m.project.workspace.name,
      })),
    };
  }

  async updateUserStatus(userId: number, isBlocked: boolean): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { isBlocked },
    });
  }

  async updateUserSystemRole(userId: number, role: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { systemRole: role as never },
    });
  }

  // -------------------------------------------------------------------------
  // Owner Oversight
  // -------------------------------------------------------------------------

  async getWorkspaces(
    options: OwnerOversightListOptions,
  ): Promise<{ data: OwnerWorkspaceItem[]; total: number }> {
    const where = {
      deletedAt: null,
      ...(options.search
        ? {
            OR: [
              { name: { contains: options.search } },
              { slug: { contains: options.search } },
            ],
          }
        : {}),
    };

    const [workspaces, total] = await Promise.all([
      prisma.workspace.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          updatedAt: true,
          members: {
            where: { deletedAt: null },
            select: { role: true },
          },
          projects: {
            where: { deletedAt: null },
            select: {
              id: true,
              tasks: {
                where: { deletedAt: null },
                select: { id: true },
              },
            },
          },
        },
      }),
      prisma.workspace.count({ where }),
    ]);

    return {
      total,
      data: workspaces.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
        memberCount: workspace.members.length,
        adminCount: workspace.members.filter((member) => member.role === 'OWNER' || member.role === 'ADMIN').length,
        projectCount: workspace.projects.length,
        taskCount: workspace.projects.reduce((sum, project) => sum + project.tasks.length, 0),
      })),
    };
  }

  async getProjects(
    options: OwnerOversightListOptions,
  ): Promise<{ data: OwnerProjectItem[]; total: number }> {
    const where = {
      deletedAt: null,
      ...(options.search
        ? {
            OR: [
              { name: { contains: options.search } },
              { key: { contains: options.search } },
              { workspace: { name: { contains: options.search } } },
            ],
          }
        : {}),
    };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        select: {
          id: true,
          name: true,
          key: true,
          color: true,
          createdAt: true,
          updatedAt: true,
          workspace: { select: { id: true, name: true, slug: true } },
          owner: { select: { id: true, name: true, email: true } },
          projectMembers: {
            where: { deletedAt: null },
            select: { id: true },
          },
          tasks: {
            where: { deletedAt: null },
            select: { id: true, dueDate: true, status: true },
          },
        },
      }),
      prisma.project.count({ where }),
    ]);

    const now = new Date();
    return {
      total,
      data: projects.map((project) => ({
        id: project.id,
        name: project.name,
        key: project.key,
        color: project.color,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        workspace: project.workspace,
        owner: project.owner,
        memberCount: project.projectMembers.length,
        taskCount: project.tasks.length,
        overdueTaskCount: project.tasks.filter((task) => task.dueDate && task.dueDate < now && task.status !== 'DONE').length,
      })),
    };
  }

  // -------------------------------------------------------------------------
  // System Health & Maintenance
  // -------------------------------------------------------------------------

  async getSystemHealth(): Promise<OwnerSystemHealth> {
    const now = new Date();
    let database: OwnerSystemHealth['database'] = {
      status: 'ok',
      message: 'Database is reachable',
    };

    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      database = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Database check failed',
      };
    }

    const [
      settings,
      activeRefreshTokens,
      expiredRefreshTokens,
      expiredOtpCodes,
      blockedUsers,
      overdueTasks,
      pendingInvitations,
      owners,
    ] = await Promise.all([
      prisma.systemSetting.findMany({
        where: {
          key: {
            in: [
              'smtp_user',
              'smtp_pass',
              'smtp_from',
              'google_client_id',
              'google_client_secret',
              'gmail_refresh_token',
            ],
          },
        },
        select: { key: true, value: true },
      }),
      prisma.refreshToken.count({ where: { expiresAt: { gte: now } } }),
      prisma.refreshToken.count({ where: { expiresAt: { lt: now } } }),
      prisma.otpCode.count({ where: { expiresAt: { lt: now } } }),
      prisma.user.count({ where: { deletedAt: null, isBlocked: true } }),
      prisma.task.count({
        where: {
          deletedAt: null,
          dueDate: { lt: now },
          status: { not: 'DONE' },
        },
      }),
      prisma.invitation.count({
        where: {
          deletedAt: null,
          status: 'PENDING',
          expiresAt: { gte: now },
        },
      }),
      prisma.user.count({ where: { deletedAt: null, systemRole: 'OWNER' } }),
    ]);

    const settingMap = new Map(settings.map((setting) => [setting.key, setting.value.trim()]));
    const hasDbEmailConfig = Boolean(settingMap.get('smtp_user') || settingMap.get('smtp_pass') || settingMap.get('smtp_from'));
    const hasEnvEmailConfig = Boolean(process.env.EMAIL_USER || process.env.EMAIL_PASS || process.env.EMAIL_FROM);
    const hasDbOauthConfig = Boolean(settingMap.get('google_client_id') || settingMap.get('google_client_secret'));
    const hasEnvOauthConfig = Boolean(process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET);

    return {
      generatedAt: now,
      database,
      email: {
        smtpConfigured: Boolean(
          (settingMap.get('smtp_user') || process.env.EMAIL_USER) &&
          (settingMap.get('smtp_pass') || process.env.EMAIL_PASS),
        ),
        gmailApiConfigured: Boolean(
          (settingMap.get('google_client_id') || process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID) &&
          (settingMap.get('google_client_secret') || process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET) &&
          (settingMap.get('gmail_refresh_token') || process.env.GMAIL_REFRESH_TOKEN),
        ),
        fromConfigured: Boolean(settingMap.get('smtp_from') || process.env.EMAIL_FROM || settingMap.get('smtp_user') || process.env.EMAIL_USER),
        source: hasDbEmailConfig ? 'database' : hasEnvEmailConfig ? 'environment' : 'missing',
      },
      oauth: {
        googleConfigured: Boolean(
          (settingMap.get('google_client_id') || process.env.GOOGLE_CLIENT_ID) &&
          (settingMap.get('google_client_secret') || process.env.GOOGLE_CLIENT_SECRET),
        ),
        source: hasDbOauthConfig ? 'database' : hasEnvOauthConfig ? 'environment' : 'missing',
      },
      sessions: {
        activeRefreshTokens,
        expiredRefreshTokens,
      },
      cleanup: {
        expiredOtpCodes,
      },
      riskSignals: {
        blockedUsers,
        overdueTasks,
        pendingInvitations,
        owners,
      },
    };
  }

  async cleanupExpiredRefreshTokens(): Promise<MaintenanceResult> {
    const result = await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    return { deleted: result.count };
  }

  async cleanupExpiredOtpCodes(): Promise<MaintenanceResult> {
    const result = await prisma.otpCode.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    return { deleted: result.count };
  }

  // -------------------------------------------------------------------------
  // Settings
  // -------------------------------------------------------------------------

  async getSettings(category?: string): Promise<AdminSettingItem[]> {
    const where = category ? { category } : {};
    return prisma.systemSetting.findMany({
      where,
      orderBy: { key: 'asc' },
    });
  }

  async upsertSetting(input: UpsertSettingInput): Promise<AdminSettingItem> {
    return prisma.systemSetting.upsert({
      where: { key: input.key },
      update: {
        value: input.value,
        category: input.category ?? 'general',
      },
      create: {
        key: input.key,
        value: input.value,
        category: input.category ?? 'general',
      },
    });
  }

  // -------------------------------------------------------------------------
  // Audit Logs
  // -------------------------------------------------------------------------

  async getAuditLogs(
    options: AuditLogListOptions,
  ): Promise<{ data: AuditLogItem[]; total: number }> {
    const where: Record<string, unknown> = {};

    if (options.action) {
      where.action = options.action;
    }

    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        (where.createdAt as Record<string, Date>).gte = options.startDate;
      }
      if (options.endDate) {
        (where.createdAt as Record<string, Date>).lte = options.endDate;
      }
    }

    const [data, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where: where as never,
        orderBy: { createdAt: 'desc' },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        include: {
          performedBy: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      }),
      prisma.adminAuditLog.count({ where: where as never }),
    ]);

    return { data: data as AuditLogItem[], total };
  }

  async createAuditLog(data: CreateAuditLogInput): Promise<void> {
    await prisma.adminAuditLog.create({
      data: {
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId ?? null,
        description: data.description,
        metadata: (data.metadata as object) ?? undefined,
        performedById: data.performedById,
      },
    });
  }
}

export const adminRepository = new AdminRepository();
