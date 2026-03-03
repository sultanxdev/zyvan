/**
 * Seed script — creates an initial API key and a test endpoint.
 * Run with: npx ts-node prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const db = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create a default API key
    const rawKey = `zv_live_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const prefix = rawKey.slice(0, 12); // "zv_live_xxxx"

    const apiKey = await db.apiKey.upsert({
        where: { keyHash },
        update: {},
        create: {
            keyHash,
            prefix,
            name: 'Default Dev Key',
        },
    });

    console.log('✅ API Key created:');
    console.log(`   Key  : ${rawKey}  ← COPY THIS, shown only once`);
    console.log(`   ID   : ${apiKey.id}`);
    console.log(`   Prefix: ${prefix}`);

    // Create a test endpoint (points to webhook.site for local testing)
    const signingSecret = crypto.randomBytes(32).toString('hex');
    const endpoint = await db.endpoint.create({
        data: {
            url: 'https://webhook.site/your-unique-id', // replace during testing
            signingSecret,
            maxRetries: 5,
            timeoutMs: 30000,
        },
    });

    console.log('\n✅ Test Endpoint created:');
    console.log(`   ID            : ${endpoint.id}`);
    console.log(`   URL           : ${endpoint.url}`);
    console.log(`   Signing Secret: ${signingSecret}  ← COPY THIS`);
    console.log('\n🌱 Seed complete.');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(() => db.$disconnect());
