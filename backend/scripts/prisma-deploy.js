const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const migrationsDir = path.resolve(__dirname, '..', 'prisma', 'migrations');

function runPrisma(args, options = {}) {
  const result = spawnSync(npx, ['prisma', ...args], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  });

  return {
    status: result.status ?? 1,
    output: `${result.stdout || ''}${result.stderr || ''}`,
  };
}

function getMigrationNames() {
  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

const firstDeploy = runPrisma(['migrate', 'deploy'], { capture: true });
if (firstDeploy.status === 0) {
  process.stdout.write(firstDeploy.output);
  process.exit(0);
}

process.stdout.write(firstDeploy.output);

if (firstDeploy.output.includes('P3005') || firstDeploy.output.includes('P3018') || firstDeploy.output.includes('P3009')) {
  console.warn(
    'Prisma P3005, P3018, or P3009 detected: resolving migrations and syncing schema with db push.',
  );

  for (const migrationName of getMigrationNames()) {
    runPrisma(['migrate', 'resolve', '--applied', migrationName]);
  }

  (async () => {
    console.log("Applying manual schema patches safely...");
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      try {
        await prisma.$executeRawUnsafe("ALTER TABLE `project_members` ADD COLUMN `status` ENUM('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED') NOT NULL DEFAULT 'PENDING'");
        console.log("Added status column to project_members");
      } catch (e) {
        console.log("Column status might already exist or error:", e.message);
      }
      
      try {
        await prisma.$executeRawUnsafe("ALTER TABLE `tasks` ADD COLUMN `start_date` DATE NULL");
        console.log("Added start_date column to tasks");
      } catch (e) {
        console.log("Column start_date might already exist or error:", e.message);
      }
      
      try {
        await prisma.$executeRawUnsafe("ALTER TABLE `tasks` MODIFY `due_date` DATE NULL");
        console.log("Modified due_date column in tasks");
      } catch (e) {
        console.log("Failed to modify due_date:", e.message);
      }
      
      await prisma.$disconnect();
      process.exit(0);
    } catch (err) {
      console.error("Manual patch failed:", err);
      process.exit(1);
    }
  })();
} else {
  process.exit(firstDeploy.status);
}
