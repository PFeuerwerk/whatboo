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

  SMTP_HOST: Joi.string().default('localhost'),
  SMTP_PORT: Joi.number().default(1025),
  SMTP_USER: Joi.string().optional().allow(''),
  SMTP_PASS: Joi.string().optional().allow(''),
  SMTP_SECURE: Joi.boolean().truthy('true').falsy('false').default(false),
  SMTP_CONNECTION_TIMEOUT_MS: Joi.number().default(10000),
  SMTP_MAX_CONNECTIONS: Joi.number().default(5),
  SMTP_MAX_MESSAGES: Joi.number().default(100),

  EMAIL_FROM: Joi.string().email().default('no-reply@whatboo.local'),
  EMAIL_FROM_NAME: Joi.string().default('Whatboo'),
  EMAIL_REPLY_TO: Joi.string().email().optional().allow(''),
  EMAIL_TEMPLATE_DIR: Joi.string().optional().allow(''),
  EMAIL_QUEUE_ATTEMPTS: Joi.number().default(5),
  EMAIL_QUEUE_BACKOFF_MS: Joi.number().default(5000),
  EMAIL_WORKER_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
  EMAIL_WORKER_CONCURRENCY: Joi.number().default(5),

  WEB_APP_URL: Joi.string().uri().default('http://localhost:4200'),
});
