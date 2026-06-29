import { z } from 'zod';

const messageSchema = z.object({
  id: z.string().min(1).max(256),
  from: z.string().min(4).max(32),
  timestamp: z.string().optional(),
  type: z.enum(['text', 'audio', 'interactive', 'button', 'image', 'document']).optional(),
  text: z.object({
    body: z.string().max(4096),
  }).optional(),
  audio: z.object({
    id: z.string().min(1).max(256),
  }).optional(),
}).passthrough();

const statusSchema = z.object({
  id: z.string().optional(),
  status: z.string().min(1).max(64),
  recipient_id: z.string().optional(),
  timestamp: z.string().optional(),
  errors: z.array(z.object({
    code: z.union([z.string(), z.number()]).optional(),
    title: z.string().optional(),
    message: z.string().optional(),
  }).passthrough()).optional(),
}).passthrough();

const valueSchema = z.object({
  messaging_product: z.literal('whatsapp').optional(),
  metadata: z.object({
    display_phone_number: z.string().min(4).max(32).optional(),
    phone_number_id: z.string().min(1).max(64).optional(),
  }).passthrough().optional(),
  contacts: z.array(z.unknown()).optional(),
  messages: z.array(messageSchema).max(20).optional(),
  statuses: z.array(statusSchema).max(50).optional(),
}).passthrough().refine(
  (value) => (value.messages?.length ?? 0) > 0 || (value.statuses?.length ?? 0) > 0,
  'Webhook payload must contain messages or statuses.',
);

export const whatsappWebhookSchema = z.object({
  object: z.string().min(1).max(64).optional(),
  entry: z.array(z.object({
    id: z.string().optional(),
    changes: z.array(z.object({
      field: z.string().optional(),
      value: valueSchema,
    }).passthrough()).min(1).max(20),
  }).passthrough()).min(1).max(20),
}).passthrough();

export type WhatsappWebhookPayload = z.infer<typeof whatsappWebhookSchema>;
