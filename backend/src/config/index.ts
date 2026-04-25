import prisma from './database';
import config from './env';

export * from './constants';
export type { EnvConfig } from './env';
export { default as config } from './env';
export { default as prisma } from './database';

// Backward-compatible named re-exports
export { prisma as prismaClient };
