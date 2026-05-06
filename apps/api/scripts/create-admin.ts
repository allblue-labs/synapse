/**
 * create-admin — provisions the first administrator on a fresh deployment.
 *
 * Usage:
 *   ADMIN_EMAIL=you@company.com ADMIN_PASSWORD='at-least-12-chars' npm run admin:create
 *
 * Optional overrides:
 *   ADMIN_NAME           — defaults to "Administrator"
 *   ADMIN_TENANT_NAME    — defaults to "Synapse HQ"
 *   ADMIN_TENANT_SLUG    — defaults to "synapse-hq" (must match /^[a-z0-9-]{3,48}$/)
 *
 * Behaviour:
 *   - Reads credentials EXCLUSIVELY from environment variables.
 *   - Validates inputs before touching the database.
 *   - Hashes the password with argon2 (matching auth.service.ts).
 *   - If a user with the same email already exists, exits 0 with a clear
 *     "already provisioned" message — never duplicates, never overwrites.
 *   - If the user exists but has no membership, attaches them as OWNER of
 *     the resolved tenant (recovery from a partial provision).
 *   - The password value is NEVER printed or logged.
 *   - Exit codes: 0 on success / no-op, 1 on validation error or DB failure.
 */

import {PrismaClient, TenantStatus, UserRole} from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

// ── Constants ─────────────────────────────────────────────────────────
const MIN_PASSWORD_LENGTH = 12;
const SLUG_PATTERN = /^[a-z0-9-]{3,48}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Logging helpers (no password ever crosses the boundary) ───────────
function info(msg: string)  { process.stdout.write(`  ${msg}\n`); }
function ok(msg: string)    { process.stdout.write(`\x1b[32m  ✓\x1b[0m ${msg}\n`); }
function warn(msg: string)  { process.stdout.write(`\x1b[33m  !\x1b[0m ${msg}\n`); }
function fail(msg: string)  { process.stderr.write(`\x1b[31m  ✗\x1b[0m ${msg}\n`); }

// ── Input validation ──────────────────────────────────────────────────
interface AdminInput {
  email: string;
  password: string;
  name: string;
  tenantName: string;
  tenantSlug: string;
}

function readAndValidateInput(): AdminInput {
  const errors: string[] = [];

  const email    = (process.env.ADMIN_EMAIL    ?? '').toLowerCase().trim();
  const password =  process.env.ADMIN_PASSWORD ?? '';

  const name        = (process.env.ADMIN_NAME         ?? 'Administrator').trim();
  const tenantName  = (process.env.ADMIN_TENANT_NAME  ?? 'Synapse HQ').trim();
  const tenantSlug  = (process.env.ADMIN_TENANT_SLUG  ?? 'synapse-hq').toLowerCase().trim();

  if (!email)        errors.push('ADMIN_EMAIL is required.');
  if (!password)     errors.push('ADMIN_PASSWORD is required.');

  if (email && !EMAIL_PATTERN.test(email)) {
    errors.push('ADMIN_EMAIL is not a valid email address.');
  }
  if (password && password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (!SLUG_PATTERN.test(tenantSlug)) {
    errors.push('ADMIN_TENANT_SLUG must match /^[a-z0-9-]{3,48}$/.');
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

  return {email, password, name, tenantName, tenantSlug};
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  process.stdout.write('\n  ── Synapse · provision first administrator ──────────────\n\n');

  const input = readAndValidateInput();

  info(`Email   : ${input.email}`);
  info(`Name    : ${input.name}`);
  info(`Tenant  : ${input.tenantName} (slug: ${input.tenantSlug})`);
  info(`Role    : ${UserRole.OWNER}`);
  process.stdout.write('\n');

  // Step 1 — does the user already exist?
  const existing = await prisma.user.findUnique({
    where: {email: input.email},
    include: {memberships: {select: {role: true, tenantId: true}}},
  });

  if (existing) {
    if (existing.memberships.length > 0) {
      warn(`User "${input.email}" already exists — no changes made.`);
      info(`Roles   : ${existing.memberships.map((m) => m.role).join(', ')}`);
      process.stdout.write('\n  Done.\n\n');
      await prisma.$disconnect();
      return;
    }

    // Edge case: user exists but has no tenant — attach as OWNER of the resolved tenant.
    warn(`User "${input.email}" exists but has no tenant membership — attaching now.`);
    const tenant = await ensureTenant(input.tenantName, input.tenantSlug);
    await prisma.userMembership.create({
      data: {tenantId: tenant.id, userId: existing.id, role: UserRole.OWNER},
    });
    ok(`Attached existing user as ${UserRole.OWNER} of "${tenant.name}".`);
    process.stdout.write('\n  Done.\n\n');
    await prisma.$disconnect();
    return;
  }

  // Step 2 — fresh provision: tenant + user + membership in a transaction.
  const tenant = await ensureTenant(input.tenantName, input.tenantSlug);

  const passwordHash = await argon2.hash(input.password);

  await prisma.user.create({
    data: {
      email:        input.email,
      name:         input.name,
      passwordHash,
      memberships: {
        create: {tenantId: tenant.id, role: UserRole.OWNER},
      },
    },
  });

  ok(`Created user "${input.email}" as ${UserRole.OWNER} of "${tenant.name}".`);
  process.stdout.write('\n  Done.\n\n');
}

async function ensureTenant(name: string, slug: string) {
  const existing = await prisma.tenant.findUnique({where: {slug}});
  if (existing) {
    info(`Reusing existing tenant "${existing.name}" (slug: ${slug}).`);
    return existing;
  }

  const created = await prisma.tenant.create({
    data: {
      name,
      slug,
      status: TenantStatus.ACTIVE,
      billingAccount: {create: {planKey: 'starter'}},
    },
  });
  ok(`Created tenant "${created.name}" (slug: ${slug}).`);
  return created;
}

main()
  .catch((err) => {
    fail('Failed to provision administrator.');
    // Note: argon2 / Prisma errors may include input objects — we deliberately
    // print only the message, never the raw error, to avoid surfacing the password.
    fail(err instanceof Error ? err.message : String(err));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
