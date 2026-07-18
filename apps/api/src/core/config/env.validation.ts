export interface EnvironmentVariables {
  DATABASE_URL: string;
  PORT: number;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
}

/**
 * Runs synchronously during ConfigModule.forRoot() — a thrown error here aborts Nest's
 * bootstrap before the app ever starts listening, giving a clear boot-time failure instead
 * of a missing-env crash surfacing later at first use (e.g. Prisma's first query).
 */
export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const errors: string[] = [];

  const databaseUrl = config.DATABASE_URL;
  if (typeof databaseUrl !== 'string' || databaseUrl.trim() === '') {
    errors.push('DATABASE_URL is required and must be a non-empty string');
  } else if (!/^postgresql:\/\/\S+$/.test(databaseUrl)) {
    errors.push('DATABASE_URL must be a valid postgresql:// connection string');
  }

  let port = 3001;
  if (config.PORT !== undefined && config.PORT !== '') {
    const parsed = Number(config.PORT);
    if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
      errors.push('PORT must be a valid integer between 1 and 65535');
    } else {
      port = parsed;
    }
  }

  const jwtSecret = config.JWT_SECRET;
  if (typeof jwtSecret !== 'string' || jwtSecret.trim().length < 32) {
    errors.push('JWT_SECRET is required and must be at least 32 characters long');
  }

  const jwtExpiresIn =
    typeof config.JWT_EXPIRES_IN === 'string' && config.JWT_EXPIRES_IN.trim() !== ''
      ? config.JWT_EXPIRES_IN
      : '1h';

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n- ${errors.join('\n- ')}`);
  }

  return {
    DATABASE_URL: databaseUrl as string,
    PORT: port,
    JWT_SECRET: jwtSecret as string,
    JWT_EXPIRES_IN: jwtExpiresIn,
  };
}
