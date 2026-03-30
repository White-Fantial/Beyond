#!/usr/bin/env node
/**
 * Prisma migration deployment script with P3009 recovery.
 *
 * Runs `prisma migrate deploy`. If Prisma reports P3009 (one or more
 * previously-failed migrations recorded in the target database), this script
 * resolves each failed migration as rolled-back and retries the deploy.
 *
 * This is the standard Prisma-recommended recovery path when a migration that
 * failed mid-run (and was therefore rolled back by Postgres) is still recorded
 * as "failed" in the _prisma_migrations table.
 *
 * Usage:  node scripts/migrate-deploy.js
 *   or:   npm run prisma:deploy
 */

'use strict';

const { spawnSync } = require('child_process');

const PRISMA_BIN = 'npx prisma';

/**
 * Spawn a shell command and return its result.
 * Stdout and stderr are captured separately to avoid interleaving issues.
 */
function run(cmd, opts = {}) {
  return spawnSync(cmd, { shell: true, encoding: 'utf8', ...opts });
}

/**
 * Mark a named migration as rolled-back so Prisma will re-apply it.
 */
function resolveRolledBack(migrationName) {
  console.log(`  → Marking as rolled-back: ${migrationName}`);
  const result = run(`${PRISMA_BIN} migrate resolve --rolled-back "${migrationName}"`, {
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.stderr.write(`Failed to resolve migration "${migrationName}"\n`);
    process.exit(result.status ?? 1);
  }
}

/**
 * Extract failed migration names from Prisma's P3009 error output.
 * Prisma error format: The `<migration_name>` migration started at <timestamp> failed
 *
 * Returns an array of migration names, or an empty array if none are found.
 */
function extractFailedMigrations(stdout, stderr) {
  const combined = stdout + '\n' + stderr;
  const pattern = /The `([^`]+)` migration started at .+ failed/g;
  let match;
  const failed = [];
  while ((match = pattern.exec(combined)) !== null) {
    failed.push(match[1]);
  }
  return failed;
}

function main() {
  // First attempt — capture stdout and stderr separately
  const first = run(`${PRISMA_BIN} migrate deploy`, { stdio: ['inherit', 'pipe', 'pipe'] });

  const stdout = first.stdout ?? '';
  const stderr = first.stderr ?? '';

  if (first.status === 0) {
    process.stdout.write(stdout);
    process.stderr.write(stderr);
    return;
  }

  // Surface captured output before deciding how to proceed
  process.stdout.write(stdout);
  process.stderr.write(stderr);

  // Check for P3009 — failed migrations blocking the deploy
  if (stdout.includes('P3009') || stderr.includes('P3009')) {
    console.log('\nP3009 detected: resolving failed migration(s) and retrying...\n');

    const failed = extractFailedMigrations(stdout, stderr);

    if (failed.length === 0) {
      process.stderr.write(
        'Could not extract failed migration name(s) from P3009 output.\n' +
          'Resolve manually with:\n' +
          '  npx prisma migrate resolve --rolled-back <migration_name>\n' +
          'Then re-run: npx prisma migrate deploy\n'
      );
      process.exit(1);
    }

    for (const name of failed) {
      resolveRolledBack(name);
    }

    // Retry deploy with the resolved migrations
    console.log('\nRetrying: prisma migrate deploy\n');
    const retry = run(`${PRISMA_BIN} migrate deploy`, { stdio: 'inherit' });
    if (retry.status !== 0) {
      process.exit(retry.status ?? 1);
    }
  } else {
    // Some other error — already surfaced above, just exit
    process.exit(first.status ?? 1);
  }
}

main();
