import { spawnSync } from 'node:child_process';

if (process.env.VERCEL_ENV !== 'production') {
  console.log('Skipping production schema sync outside Vercel production.');
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required for the production schema sync.');
  process.exit(1);
}

console.log('Checking production database schema before build...');

const prismaCommand = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';
const result = spawnSync(prismaCommand, ['db', 'push', '--skip-generate'], {
  env: process.env,
  stdio: 'inherit',
});

if (result.error) {
  console.error(`Unable to start Prisma schema sync: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
