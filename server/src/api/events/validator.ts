import { z } from 'zod';

export const IngestEventSchema = z.object({
    endpoint_id: z.string().uuid({ message: 'endpoint_id must be a valid UUID' }),
    event_type: z
        .string()
        .min(1, 'event_type is required')
        .max(100, 'event_type must be 100 characters or less')
        .regex(/^[a-z0-9_.]+$/i, 'event_type can only contain letters, numbers, dots, and underscores'),
    payload: z.record(z.unknown()).refine(
        (val) => Object.keys(val).length > 0,
        { message: 'payload cannot be empty' }
    ),
    metadata: z.record(z.unknown()).optional(),
});

export type IngestEventInput = z.infer<typeof IngestEventSchema>;
