import { ConfigService } from '@nestjs/config';

interface JwtSecretEntry {
  kid: string;
  secret: string;
}

export function getJwtSecrets(config: ConfigService): JwtSecretEntry[] {
  const configured = config.get<string>('JWT_SECRETS', '').trim();
  if (configured) {
    return configured
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry, index) => {
        const separator = entry.indexOf(':');
        if (separator === -1) {
          return { kid: `k${index + 1}`, secret: entry };
        }
        return {
          kid: entry.slice(0, separator),
          secret: entry.slice(separator + 1),
        };
      })
      .filter((entry) => entry.secret.length > 0);
  }

  const fallback = config.get<string>('JWT_SECRET');
  return fallback ? [{ kid: config.get<string>('JWT_ACTIVE_KID', 'default'), secret: fallback }] : [];
}

export function getActiveJwtSecret(config: ConfigService): JwtSecretEntry {
  const secrets = getJwtSecrets(config);
  const activeKid = config.get<string>('JWT_ACTIVE_KID');
  const active = activeKid ? secrets.find((entry) => entry.kid === activeKid) : undefined;
  const selected = active ?? secrets[0];
  if (!selected) {
    throw new Error('JWT secret configuration is missing.');
  }
  return selected;
}