import { prisma } from '../../config';
import { logger } from './logger';

/**
 * Ensure default OWNER accounts exist in the system.
 * This runs on every server startup. If the user already exists,
 * it only updates the systemRole to OWNER (idempotent).
 * If the user doesn't exist yet, it will be created when they first
 * register/login — at that point this seed won't create the account,
 * but once they register, the next restart will promote them.
 */
export async function seedOwnerAccounts(): Promise<void> {
  const ownerEmails = ['khanhdangabc2@gmail.com'];

  for (const email of ownerEmails) {
    try {
      const user = await prisma.user.findUnique({ where: { email } });

      if (user) {
        if (user.systemRole !== 'OWNER') {
          await prisma.user.update({
            where: { id: user.id },
            data: { systemRole: 'OWNER' },
          });
          logger.info(`[Seed] Promoted user ${email} to OWNER`);
        } else {
          logger.info(`[Seed] User ${email} is already OWNER — skipping`);
        }
      } else {
        logger.warn(
          `[Seed] User ${email} not found in database. They will be promoted to OWNER after registration.`,
        );
      }
    } catch (error) {
      logger.error(`[Seed] Failed to seed owner account for ${email}`, error);
    }
  }
}
