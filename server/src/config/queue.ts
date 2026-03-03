import { Queue } from 'bullmq';
import { config } from './env';

export const queue = new Queue('event-dispatch', {
    connection: { url: config.redisUrl },
    defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 500,
    },
});

queue.on('error', (err) => {
    console.error('[Queue] BullMQ connection error:', err.message);
});
