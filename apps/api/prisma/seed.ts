/**
 * Prisma seed — creates a default admin tenant + owner user for local testing.
 *
 * Idempotent: safe to run multiple times — uses upsert by unique slugs/emails.
 *
 * Run manually:
 *   cd apps/api
 *   npx prisma db seed
 *
 * Override defaults via env vars:
 *   SEED_ADMIN_EMAIL=...
 *   SEED_ADMIN_PASSWORD=...
 *   SEED_ADMIN_NAME=...
 *   SEED_TENANT_NAME=...
 *   SEED_TENANT_SLUG=...
 */

import {PrismaClient, UserRole, TenantStatus} from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL    ?? 'admin@synapse.ai';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Neri7%Xasa6!Cowi3%Jiru1!Xujo6^Zolu1';
const ADMIN_NAME     = process.env.SEED_ADMIN_NAME     ?? 'Administrator';
const TENANT_NAME    = process.env.SEED_TENANT_NAME    ?? 'Synapse HQ';
const TENANT_SLUG    = process.env.SEED_TENANT_SLUG    ?? 'synapse-hq';

async function main() {
  const email = ADMIN_EMAIL.toLowerCase().trim();
  const slug  = TENANT_SLUG.toLowerCase().trim();

  // 1. Tenant — upsert by slug
  const tenant = await prisma.tenant.upsert({
    where: {slug},
    update: {
      name: TENANT_NAME,
      status: TenantStatus.ACTIVE,
    },
    create: {
      name: TENANT_NAME,
      slug,
      status: TenantStatus.ACTIVE,
      billingAccount: {
        create: {planKey: 'starter'},
      },
    },
  });

  // 2. User — upsert by email (always re-hash password to match seed value)
  const passwordHash = await argon2.hash(ADMIN_PASSWORD);
  const user = await prisma.user.upsert({
    where: {email},
    update: {
      name: ADMIN_NAME,
      passwordHash,
    },
    create: {
      email,
      name: ADMIN_NAME,
      passwordHash,
    },
  });

  // 3. Membership — ensure user is OWNER of tenant
  await prisma.userMembership.upsert({
    where: {
      tenantId_userId: {tenantId: tenant.id, userId: user.id},
    },
    update: {
      role: UserRole.OWNER,
    },
    create: {
      tenantId: tenant.id,
      userId:   user.id,
      role:     UserRole.OWNER,
    },
  });

  console.log('\n  ✓ Seed complete\n');
  console.log('    Tenant   :', TENANT_NAME, `(slug: ${slug})`);
  console.log('    Email    :', email);
  console.log('    Password :', ADMIN_PASSWORD);
  console.log('    Role     : OWNER');
  console.log('\n  Sign in at http://localhost:3000/login\n');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
