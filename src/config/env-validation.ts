/**
 * Strict environment validation that runs at module load time.
 * In production, missing required variables cause the process to exit immediately.
 */

interface EnvRule {
    key: string;
    required: 'always' | 'production';
    warnIfDefault?: string;
}

const rules: EnvRule[] = [
    { key: 'DATABASE_URL', required: 'always' },
    { key: 'JWT_ACCESS_SECRET', required: 'production', warnIfDefault: 'change-me-in-production' },
    { key: 'JWT_REFRESH_SECRET', required: 'production', warnIfDefault: 'change-me-in-production' },
    { key: 'CORS_ORIGINS', required: 'production' },
];

export function validateEnvironment(): void {
    const isProd = process.env.NODE_ENV === 'production';
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const rule of rules) {
        const value = process.env[rule.key];

        if (!value) {
            if (rule.required === 'always') {
                errors.push(`Missing required env var: ${rule.key}`);
            } else if (rule.required === 'production' && isProd) {
                errors.push(`Missing required env var (production): ${rule.key}`);
            }
            continue;
        }

        if (isProd && rule.warnIfDefault && value === rule.warnIfDefault) {
            warnings.push(`${rule.key} is using the default dev value in production!`);
        }
    }

    for (const w of warnings) {
        console.warn(`[EnvValidation] WARNING: ${w}`);
    }

    if (errors.length > 0) {
        console.error('[EnvValidation] FATAL: Environment validation failed:');
        for (const e of errors) {
            console.error(`  - ${e}`);
        }
        process.exit(1);
    }
}
