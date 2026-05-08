/**
 * create-admin - provisions the first platform administrator on a fresh deployment.
 *
 * Usage:
 *   ADMIN_EMAIL=you@company.com ADMIN_PASSWORD='at-least-12-chars' npm run admin:create
 *
 * Optional overrides:
 *   ADMIN_NAME - defaults to "Administrator"
 *
 * Behaviour:
 *   - Reads credentials EXCLUSIVELY from environment variables.
 *   - Validates inputs before touching the database.
 *   - Hashes the password with argon2 (matching auth.service.ts).
 *   - Creates or upgrades the user as SUPER_ADMIN.
 *   - Does NOT create a tenant, billing account, or tenant membership.
 *   - The password value is NEVER printed or logged.
 *   - Exit codes: 0 on success / no-op, 1 on validation error or DB failure.
 */

import {PlatformRole, PrismaClient} from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const MIN_PASSWORD_LENGTH = 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function info(msg: string)  { process.stdout.write(`  ${msg}\n`); }
function ok(msg: string)    { process.stdout.write(`\x1b[32m  OK\x1b[0m ${msg}\n`); }
function warn(msg: string)  { process.stdout.write(`\x1b[33m  !!\x1b[0m ${msg}\n`); }
function fail(msg: string)  { process.stderr.write(`\x1b[31m  XX\x1b[0m ${msg}\n`); }

interface AdminInput {
  email: string;
  password: string;
  name: string;
}

function readAndValidateInput(): AdminInput {
  const errors: string[] = [];

  const email    = (process.env.ADMIN_EMAIL    ?? '').toLowerCase().trim();
  const password =  process.env.ADMIN_PASSWORD ?? '';
  const name     = (process.env.ADMIN_NAME     ?? 'Administrator').trim();

  if (!email)    errors.push('ADMIN_EMAIL is required.');
  if (!password) errors.push('ADMIN_PASSWORD is required.');

  if (email && !EMAIL_PATTERN.test(email)) {
    errors.push('ADMIN_EMAIL is not a valid email address.');
  }
  if (password && password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (!name) {
    errors.push('ADMIN_NAME cannot be blank when set.');
  }

  if (errors.length) {
    fail('Invalid input:');
    for (const e of errors) fail(`    - ${e}`);
    process.stderr.write('\n  Set ADMIN_EMAIL and ADMIN_PASSWORD as environment variables and try again.\n\n');
    process.exit(1);
  }

  return {email, password, name};
}

async function main() {
  process.stdout.write('\n  -- Synapse :: provision platform administrator ----------\n\n');

  const input = readAndValidateInput();

  info(`Email   : ${input.email}`);
  info(`Name    : ${input.name}`);
  info(`Role    : ${PlatformRole.SUPER_ADMIN}`);
  process.stdout.write('\n');

  const existing = await prisma.user.findUnique({
    where: {email: input.email},
    select: {id: true, email: true, platformRole: true},
  });

  if (existing) {
    if (existing.platformRole === PlatformRole.SUPER_ADMIN) {
      warn(`User "${input.email}" is already a super administrator - no changes made.`);
      process.stdout.write('\n  Done.\n\n');
      return;
    }

    await prisma.user.update({
      where: {id: existing.id},
      data: {platformRole: PlatformRole.SUPER_ADMIN},
    });
    ok(`Upgraded existing user "${input.email}" to ${PlatformRole.SUPER_ADMIN}.`);
    process.stdout.write('\n  Done.\n\n');
    return;
  }

  const passwordHash = await argon2.hash(input.password);

  await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
      platformRole: PlatformRole.SUPER_ADMIN,
    },
  });

  ok(`Created user "${input.email}" as ${PlatformRole.SUPER_ADMIN}.`);
  process.stdout.write('\n  Done.\n\n');
}

main()
  .catch((err) => {
    fail('Failed to provision platform administrator.');
    fail(err instanceof Error ? err.message : String(err));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
