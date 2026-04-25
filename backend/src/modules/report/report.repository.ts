import { prisma } from '../../config';

export class ReportRepository {
  async getWorkspaceStats(workspaceId: number) {
    const [
      memberCount,
      projectCount,
      taskCount,
      completedTaskCount,
    ] = await Promise.all([
      prisma.workspaceMember.count({
        where: { workspaceId, deletedAt: null },
      }),
      prisma.project.count({
        where: { workspaceId, deletedAt: null },
      }),
      prisma.task.count({
        where: {
          project: { workspaceId },
          deletedAt: null,
        },
      }),
      prisma.task.count({
        where: {
          project: { workspaceId },
          status: 'DONE',
          deletedAt: null,
        },
      }),
    ]);

    return {
      memberCount,
      projectCount,
      taskCount,
      completedTaskCount,
      completionRate: taskCount > 0 ? (completedTaskCount / taskCount) * 100 : 0,
    };
  }

  async getProjectProgress(projectId: number) {
    const [totalTasks, tasksByStatus, avgCompletionTime] = await Promise.all([
      prisma.task.count({
        where: { projectId, deletedAt: null },
      }),
      prisma.task.groupBy({
        by: ['status'],
        where: { projectId, deletedAt: null },
        _count: { status: true },
      }),
      // Calculate average time to completion for done tasks
      prisma.task.aggregate({
        where: {
          projectId,
          status: 'DONE',
          deletedAt: null,
        },
        _avg: {
          loggedHours: true,
        },
      }),
    ]);

    const statusBreakdown = tasksByStatus.reduce((acc: Record<string, number>, item: any) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTasks,
      statusBreakdown,
      avgLoggedHours: avgCompletionTime._avg.loggedHours || 0,
      completionRate: totalTasks > 0 ? ((statusBreakdown['DONE'] || 0) / totalTasks) * 100 : 0,
    };
  }

  async getBurndownData(projectId: number, startDate: Date, endDate: Date) {
    const tasks = await prisma.task.findMany({
      where: {
        projectId,
        createdAt: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Get all completed tasks with their completion dates
    const completedTasks = await prisma.task.findMany({
      where: {
        projectId,
        status: 'DONE',
        updatedAt: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      select: {
        id: true,
        updatedAt: true,
      },
    });

    // Group by date
    const dailyBurndown = this.calculateDailyBurndown(
      tasks.length,
      completedTasks.map((t: any) => t.updatedAt),
      startDate,
      endDate
    );

    return {
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      dailyData: dailyBurndown,
    };
  }

  async getWorkloadReport(workspaceId: number) {
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId, deletedAt: null },
      include: {
        user: {
          include: {
            assignedTasks: {
              where: {
                project: { workspaceId },
                deletedAt: null,
              },
              select: {
                id: true,
                status: true,
                priority: true,
                estimatedHours: true,
                loggedHours: true,
              },
            },
          },
        },
      },
    });

    const workloadData = members.map((member: any) => {
      const tasks = member.user.assignedTasks;
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t: any) => t.status === 'DONE').length;
      const inProgressTasks = tasks.filter((t: any) => t.status === 'IN_PROGRESS').length;
      const totalEstimatedHours = tasks.reduce((sum: number, t: any) => sum + (t.estimatedHours || 0), 0);
      const totalLoggedHours = tasks.reduce((sum: number, t: any) => sum + t.loggedHours, 0);

      return {
        userId: member.user.id,
        userName: member.user.name,
        userEmail: member.user.email,
        userAvatar: member.user.avatar,
        role: member.role,
        totalTasks,
        completedTasks,
        inProgressTasks,
        totalEstimatedHours,
        totalLoggedHours,
        utilizationRate: totalEstimatedHours > 0 
          ? Math.min((totalLoggedHours / totalEstimatedHours) * 100, 100) 
          : 0,
      };
    });

    return { workloads: workloadData };
  }

  private calculateDailyBurndown(
    totalTasks: number,
    completionDates: Date[],
    startDate: Date,
    endDate: Date
  ) {
    const dailyData: { date: string; remaining: number; completed: number }[] = [];
    let remaining = totalTasks;

    // Count completions per day
    const completionsByDay: Record<string, number> = {};
    completionDates.forEach(date => {
      const dayKey = date.toISOString().split('T')[0];
      completionsByDay[dayKey] = (completionsByDay[dayKey] || 0) + 1;
    });

    // Generate data for each day
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayKey = currentDate.toISOString().split('T')[0];
      const completed = completionsByDay[dayKey] || 0;
      remaining -= completed;

      dailyData.push({
        date: dayKey,
        remaining: Math.max(remaining, 0),
        completed,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dailyData;
  }
}

export const reportRepository = new ReportRepository();
