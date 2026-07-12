type EnvShape = Record<string, string | undefined>;

function required(env: EnvShape, key: string): string {
  const value = env[key];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.trim();
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Expected numeric environment value, received: ${value}`);
  }
  return parsed;
}

function parseOrigins(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function validateEnv(env: EnvShape) {
  return {
    NODE_ENV: env.NODE_ENV ?? "development",
    PORT: parseNumber(env.PORT, 3000),
    API_PREFIX: env.API_PREFIX ?? "api/v1",
    DATABASE_URL: required(env, "DATABASE_URL"),
    JWT_ACCESS_SECRET: required(env, "JWT_ACCESS_SECRET"),
    JWT_REFRESH_SECRET: required(env, "JWT_REFRESH_SECRET"),
    JWT_ACCESS_EXPIRES_IN: env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    JWT_REFRESH_EXPIRES_IN_DAYS: parseNumber(env.JWT_REFRESH_EXPIRES_IN_DAYS, 30),
    CORS_ORIGINS: parseOrigins(env.CORS_ORIGINS),
    TRUST_PROXY: parseBoolean(env.TRUST_PROXY, false),
    SWAGGER_ENABLED: parseBoolean(env.SWAGGER_ENABLED, true),
    SWAGGER_PATH: env.SWAGGER_PATH ?? "docs",
    BCRYPT_ROUNDS: parseNumber(env.BCRYPT_ROUNDS, 12),
  };
}
