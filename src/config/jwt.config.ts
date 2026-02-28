import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
    accessSecret: process.env.JWT_ACCESS_SECRET || 'change-me-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me-in-production',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
}));
