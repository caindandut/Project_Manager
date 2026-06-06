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

if (!firstDeploy.output.includes('P3005')) {
  process.exit(firstDeploy.status);
}

console.warn(
  'Prisma P3005 detected: baselining existing non-empty database before migrate deploy.',
);

for (const migrationName of getMigrationNames()) {
  const resolveResult = runPrisma(['migrate', 'resolve', '--applied', migrationName]);
  if (resolveResult.status !== 0) {
    process.exit(resolveResult.status);
  }
}

const secondDeploy = runPrisma(['migrate', 'deploy']);
process.exit(secondDeploy.status);
