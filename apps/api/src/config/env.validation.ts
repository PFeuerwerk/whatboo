import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string().required(),

  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),

  RATE_LIMIT_SHORT_TTL_MS: Joi.number().default(1000),
  RATE_LIMIT_SHORT_LIMIT: Joi.number().default(20),
  RATE_LIMIT_LONG_TTL_MS: Joi.number().default(60000),
  RATE_LIMIT_LONG_LIMIT: Joi.number().default(300),
  WHATSAPP_WEBHOOK_TTL_MS: Joi.number().default(60000),
  WHATSAPP_WEBHOOK_LIMIT: Joi.number().default(120),
  WHATSAPP_WEBHOOK_BLOCK_MS: Joi.number().default(300000),
  WHATSAPP_WORKER_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),

  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  WHATSAPP_VERIFY_TOKEN: Joi.string().optional().allow(''),
  WHATSAPP_ACCESS_TOKEN: Joi.string().optional().allow(''),
  WHATSAPP_PHONE_NUMBER_ID: Joi.string().optional().allow(''),
  WHATSAPP_APP_SECRET: Joi.string().optional().allow(''),
});
