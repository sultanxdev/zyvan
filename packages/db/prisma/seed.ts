import { getPrismaClient, disconnectPrisma } from '../src/index';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

function hashApiKey(rawKey: string, pepper: string): string {
  return crypto.createHash('sha256').update(`${rawKey}${pepper}`).digest('hex');
}

async function main() {
  console.log('🌱 Starting Zyvan database seed...');
  const prisma = getPrismaClient();

  const apiKeyPepper = process.env.API_KEY_PEPPER || 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
  const passwordHash = await bcrypt.hash('zyvan_secure_2026', 10);

  // 1. Create or update Demo User
  const demoUser = await prisma.user.upsert({
    where: { email: 'developer@zyvan.dev' },
    update: {},
    create: {
      email: 'developer@zyvan.dev',
      name: 'Zyvan Developer',
      passwordHash,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
      role: 'admin',
    },
  });
  console.log(`👤 Demo User ready: ${demoUser.email} (${demoUser.id})`);

  // 2. Create or find Project
  let project = await prisma.project.findFirst({
    where: { ownerId: demoUser.id },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        name: 'Default Production Project',
        plan: 'scale',
        status: 'active',
        ownerId: demoUser.id,
        members: {
          create: {
            userId: demoUser.id,
            role: 'owner',
          },
        },
      },
    });
  }
  console.log(`🏢 Project ready: ${project.name} (${project.id})`);

  // 3. Create Tenant
  let tenant = await prisma.tenant.findFirst({
    where: { projectId: project.id, externalId: 'tenant_default' },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        projectId: project.id,
        externalId: 'tenant_default',
        name: 'Default Production Tenant',
        concurrencyLimit: 10,
        rateLimit: 100,
        status: 'active',
      },
    });
  }
  console.log(`👥 Tenant ready: ${tenant.name} (${tenant.id})`);

  // 4. Create API Key
  const rawDemoKey = 'zyvan_live_e891c01b2a98f128c94e09f872';
  const keyHash = hashApiKey(rawDemoKey, apiKeyPepper);

  const existingKey = await prisma.apiKey.findUnique({
    where: { keyHash },
  });

  if (!existingKey) {
    await prisma.apiKey.create({
      data: {
        projectId: project.id,
        keyHash,
        keyPrefix: 'zyvan_live_e891c',
        name: 'Default Production Key',
        scopes: [
          'events:write',
          'events:read',
          'destinations:manage',
          'tenants:manage',
          'api-keys:manage',
          'projects:read',
          'projects:manage',
          'usage:read',
        ],
      },
    });
    console.log(`🔑 Demo API Key ready: ${rawDemoKey}`);
  }

  // 5. Create Destinations
  let dest1 = await prisma.destination.findFirst({
    where: { tenantId: tenant.id, url: 'https://api.merchant.com/v1/webhooks/billing' },
  });
  if (!dest1) {
    dest1 = await prisma.destination.create({
      data: {
        tenantId: tenant.id,
        url: 'https://api.merchant.com/v1/webhooks/billing',
        rateLimit: 50,
        active: true,
        retryPolicy: { maxAttempts: 5, baseDelay: 1000, maxDelay: 60000 },
      },
    });
  }

  let dest2 = await prisma.destination.findFirst({
    where: { tenantId: tenant.id, url: 'https://orders.customer-hub.io/events/shopify' },
  });
  if (!dest2) {
    dest2 = await prisma.destination.create({
      data: {
        tenantId: tenant.id,
        url: 'https://orders.customer-hub.io/events/shopify',
        rateLimit: 25,
        active: true,
        retryPolicy: { maxAttempts: 3, baseDelay: 2000, maxDelay: 30000 },
      },
    });
  }
  console.log(`🎯 Destinations created (Billing & Shopify)`);

  // 6. Create Sample Events & Deliveries
  const sampleEvents = [
    {
      eventType: 'payment_intent.succeeded',
      idempotencyKey: 'seed_pi_9901_succeeded',
      payload: { id: 'pi_9901', amount: 49900, currency: 'usd', status: 'succeeded' },
      status: 'delivered' as const,
      deliveryStatus: 'delivered' as const,
      statusCode: 200,
      outcome: 'success' as const,
    },
    {
      eventType: 'order.created',
      idempotencyKey: 'seed_ord_5521_created',
      payload: { order_id: 'ord_5521', items_count: 3, total: 129.5 },
      status: 'delivered' as const,
      deliveryStatus: 'delivered' as const,
      statusCode: 200,
      outcome: 'success' as const,
    },
    {
      eventType: 'customer.subscription_deleted',
      idempotencyKey: 'seed_sub_1029_deleted',
      payload: { sub_id: 'sub_1029', reason: 'customer_request' },
      status: 'dead_letter' as const,
      deliveryStatus: 'failed' as const,
      statusCode: 404,
      outcome: 'failed' as const,
    },
  ];

  for (const s of sampleEvents) {
    const existingEvt = await prisma.event.findUnique({
      where: {
        projectId_idempotencyKey: {
          projectId: project.id,
          idempotencyKey: s.idempotencyKey,
        },
      },
    });

    if (!existingEvt) {
      const evt = await prisma.event.create({
        data: {
          projectId: project.id,
          tenantId: tenant.id,
          eventType: s.eventType,
          idempotencyKey: s.idempotencyKey,
          payload: s.payload,
          status: s.status,
          deliveries: {
            create: {
              destinationId: dest1.id,
              status: s.deliveryStatus,
              attemptCount: s.status === 'dead_letter' ? 4 : 1,
              lastStatusCode: s.statusCode,
              attempts: {
                create: {
                  attemptNo: 1,
                  statusCode: s.statusCode,
                  latencyMs: 112,
                  outcome: s.outcome,
                },
              },
            },
          },
        },
        include: { deliveries: true },
      });

      if (s.status === 'dead_letter' && evt.deliveries[0]) {
        await prisma.deadLetter.create({
          data: {
            eventId: evt.id,
            deliveryId: evt.deliveries[0].id,
            reason: 'Exhausted maximum retry attempts (4/4). Destination returned HTTP 404 Not Found.',
          },
        });
      }
    }
  }

  console.log('✅ Zyvan database seed finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectPrisma();
  });
