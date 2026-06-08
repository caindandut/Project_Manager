import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { config, prisma } from '../../config';
import { logger } from '../utils/logger';
import { JwtPayload } from '../middlewares/auth.middleware';

export type RealtimeEntityType =
  | 'workspace'
  | 'project'
  | 'task'
  | 'comment'
  | 'attachment'
  | 'notification'
  | 'invitation'
  | 'user'
  | 'admin';

export type RealtimeAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'read'
  | 'cleared'
  | 'restored';

export interface RealtimeEventPayload {
  type: RealtimeEntityType;
  action: RealtimeAction;
  entityId: number;
  workspaceId?: number;
  projectId?: number;
  taskId?: number;
  actorId?: number;
  userId?: number;
  timestamp: string;
}

type AuthenticatedSocket = Socket & {
  data: {
    user?: {
      id: number;
      email: string;
      systemRole?: string;
    };
  };
};

interface ScopedTask {
  id: number;
  projectId: number;
  project: {
    workspaceId: number;
  };
}

class RealtimeService {
  private io: Server | null = null;

  initialize(server: HttpServer, allowedOrigins: string[]): void {
    this.io = new Server(server, {
      cors: {
        origin: allowedOrigins,
        credentials: true,
      },
    });

    this.io.use((socket, next) => {
      const token = this.getTokenFromSocket(socket);
      if (!token) {
        next(new Error('Authentication required'));
        return;
      }

      try {
        const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
        (socket as AuthenticatedSocket).data.user = {
          id: decoded.userId,
          email: decoded.email,
          systemRole: decoded.systemRole,
        };
        next();
      } catch {
        next(new Error('Invalid access token'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const authenticatedSocket = socket as AuthenticatedSocket;
      const user = authenticatedSocket.data.user;
      if (!user) {
        socket.disconnect(true);
        return;
      }

      this.joinUserRooms(authenticatedSocket, user.id).catch((error) => {
        logger.error(`Failed to join realtime rooms for user ${user.id}`, error);
        socket.disconnect(true);
      });
    });

    logger.info('Realtime Socket.IO server initialized');
  }

  emitToUser(userId: number, payload: Omit<RealtimeEventPayload, 'timestamp'>): void {
    this.emit(`user:${userId}`, payload);
  }

  emitToOwners(payload: Omit<RealtimeEventPayload, 'timestamp'>): void {
    this.emit('owners', payload);
  }

  emitToWorkspace(workspaceId: number, payload: Omit<RealtimeEventPayload, 'timestamp' | 'workspaceId'>): void {
    this.emit(`workspace:${workspaceId}`, {
      ...payload,
      workspaceId,
    });
  }

  emitToProject(
    workspaceId: number,
    projectId: number,
    payload: Omit<RealtimeEventPayload, 'timestamp' | 'workspaceId' | 'projectId'>,
  ): void {
    const scopedPayload = {
      ...payload,
      workspaceId,
      projectId,
    };
    this.emit(`workspace:${workspaceId}`, scopedPayload);
    this.emit(`project:${projectId}`, scopedPayload);
  }

  async emitProjectEvent(
    projectId: number,
    payload: Omit<RealtimeEventPayload, 'timestamp' | 'workspaceId' | 'projectId'>,
  ): Promise<void> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true },
    });
    if (!project) return;

    this.emitToProject(project.workspaceId, projectId, payload);
  }

  async emitTaskEvent(
    taskId: number,
    payload: Omit<RealtimeEventPayload, 'timestamp' | 'workspaceId' | 'projectId' | 'taskId'>,
  ): Promise<void> {
    const task = await this.findTaskScope(taskId);
    if (!task) return;

    this.emitToProject(task.project.workspaceId, task.projectId, {
      ...payload,
      taskId,
    });
  }

  async emitTaskChildEvent(
    taskId: number,
    payload: Omit<RealtimeEventPayload, 'timestamp' | 'workspaceId' | 'projectId' | 'taskId'>,
  ): Promise<void> {
    const task = await this.findTaskScope(taskId);
    if (!task) return;

    this.emitToProject(task.project.workspaceId, task.projectId, {
      ...payload,
      taskId,
    });
  }

  async emitUserEvent(userId: number, payload: Omit<RealtimeEventPayload, 'timestamp' | 'entityId' | 'userId'>): Promise<void> {
    const [workspaceMemberships, projectMemberships] = await Promise.all([
      prisma.workspaceMember.findMany({
        where: {
          userId,
          deletedAt: null,
          workspace: { deletedAt: null },
        },
        select: { workspaceId: true },
      }),
      prisma.projectMember.findMany({
        where: {
          userId,
          status: 'ACCEPTED',
          deletedAt: null,
          project: { deletedAt: null },
        },
        select: {
          projectId: true,
          project: { select: { workspaceId: true } },
        },
      }),
    ]);

    const scopedPayload = {
      ...payload,
      entityId: userId,
      userId,
    };

    this.emit(`user:${userId}`, scopedPayload);
    this.emit('owners', scopedPayload);

    for (const membership of workspaceMemberships) {
      this.emit(`workspace:${membership.workspaceId}`, {
        ...scopedPayload,
        workspaceId: membership.workspaceId,
      });
    }

    for (const membership of projectMemberships) {
      this.emit(`project:${membership.projectId}`, {
        ...scopedPayload,
        workspaceId: membership.project.workspaceId,
        projectId: membership.projectId,
      });
    }
  }

  private emit(room: string, payload: Omit<RealtimeEventPayload, 'timestamp'>): void {
    if (!this.io) {
      return;
    }

    const event: RealtimeEventPayload = {
      ...payload,
      timestamp: new Date().toISOString(),
    };
    this.io.to(room).emit('realtime:event', event);
  }

  private getTokenFromSocket(socket: Socket): string | null {
    const authToken = socket.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim().length > 0) {
      return authToken;
    }

    const header = socket.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.substring(7);
    }

    return null;
  }

  private async joinUserRooms(socket: AuthenticatedSocket, userId: number): Promise<void> {
    socket.join(`user:${userId}`);
    if (socket.data.user?.systemRole === 'OWNER') {
      socket.join('owners');
    }

    const [workspaceMemberships, projectMemberships] = await Promise.all([
      prisma.workspaceMember.findMany({
        where: {
          userId,
          deletedAt: null,
          workspace: { deletedAt: null },
        },
        select: { workspaceId: true },
      }),
      prisma.projectMember.findMany({
        where: {
          userId,
          status: 'ACCEPTED',
          deletedAt: null,
          project: { deletedAt: null },
        },
        select: { projectId: true },
      }),
    ]);

    for (const membership of workspaceMemberships) {
      socket.join(`workspace:${membership.workspaceId}`);
    }

    for (const membership of projectMemberships) {
      socket.join(`project:${membership.projectId}`);
    }

    socket.emit('realtime:connected', {
      userId,
      workspaceIds: workspaceMemberships.map((membership) => membership.workspaceId),
      projectIds: projectMemberships.map((membership) => membership.projectId),
    });
  }

  private async findTaskScope(taskId: number): Promise<ScopedTask | null> {
    return prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        projectId: true,
        project: {
          select: {
            workspaceId: true,
          },
        },
      },
    });
  }
}

export const realtimeService = new RealtimeService();
