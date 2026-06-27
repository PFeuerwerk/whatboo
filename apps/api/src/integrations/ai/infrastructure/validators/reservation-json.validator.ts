import { z } from 'zod';

export const ReservationIntentSchema = z.object({
  intent: z.string(),
  guests: z.number().nullable(),
  date: z.string().nullable(),
  time: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export type ReservationIntentDto =
  z.infer<typeof ReservationIntentSchema>;
  