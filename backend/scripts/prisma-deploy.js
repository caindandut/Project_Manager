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

  const pushResult = runPrisma(['db', 'push', '--accept-data-loss']);
  process.exit(pushResult.status);
} else {
  process.exit(firstDeploy.status);
}
