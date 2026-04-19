import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { AUTH_REPOSITORY } from '../domain/auth.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../common/services/email.service';

const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: bcrypt.hashSync('SecurePass1!', 10),
    tenantId: 'tenant-1',
    role: 'CLINIC_ADMIN',
    firstName: 'John',
    lastName: 'Doe',
    isActive: true,
    tenant: {
        id: 'tenant-1',
        name: 'Test Clinic',
        slug: 'test-clinic',
        plan: 'PRO',
        isActive: true,
    },
};

const mockAuthRepo = {
    findUsersByEmailActive: jest.fn(),
    findUserById: jest.fn(),
    findUserByIdWithTenant: jest.fn(),
    findUserByEmail: jest.fn(),
    updateUser: jest.fn(),
    createRefreshToken: jest.fn(),
    findRefreshToken: jest.fn(),
    deleteRefreshToken: jest.fn(),
    deleteUserRefreshTokens: jest.fn(),
    countUserRefreshTokens: jest.fn(),
    changePasswordAndInvalidateSessions: jest.fn(),
    createPasswordResetToken: jest.fn(),
    findPasswordResetToken: jest.fn(),
    markPasswordResetTokenUsed: jest.fn(),
    createEmailVerificationToken: jest.fn(),
    findEmailVerificationToken: jest.fn(),
    markEmailVerificationTokenUsed: jest.fn(),
    markEmailVerified: jest.fn(),
};

const mockEmailService = {
    send: jest.fn(),
    sendPasswordReset: jest.fn(),
    sendEmailVerification: jest.fn(),
};

describe('AuthService', () => {
    let service: AuthService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: AUTH_REPOSITORY, useValue: mockAuthRepo },
                { provide: PrismaService, useValue: {} },
                {
                    provide: JwtService,
                    useValue: { sign: jest.fn().mockReturnValue('mock-jwt-token') },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockImplementation((key: string, defaultVal?: string) => {
                            const map: Record<string, string> = {
                                'jwt.accessSecret': 'test-secret',
                                'jwt.accessExpiresIn': '15m',
                            };
                            return map[key] ?? defaultVal;
                        }),
                    },
                },
                { provide: EmailService, useValue: mockEmailService },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        jest.clearAllMocks();
    });

    describe('login', () => {
        it('should return tokens on valid credentials', async () => {
            mockAuthRepo.findUsersByEmailActive.mockResolvedValue([mockUser]);
            mockAuthRepo.countUserRefreshTokens.mockResolvedValue(1);
            mockAuthRepo.createRefreshToken.mockResolvedValue(undefined);

            const result = await service.login({
                email: 'test@example.com',
                password: 'SecurePass1!',
            });

            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result.user).toBeDefined();
            expect(result.user.email).toBe('test@example.com');
        });

        it('should throw on invalid email', async () => {
            mockAuthRepo.findUsersByEmailActive.mockResolvedValue([]);

            await expect(
                service.login({ email: 'wrong@example.com', password: 'SecurePass1!' }),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw on wrong password', async () => {
            mockAuthRepo.findUsersByEmailActive.mockResolvedValue([mockUser]);

            await expect(
                service.login({ email: 'test@example.com', password: 'WrongPass1!' }),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw on suspended tenant', async () => {
            const suspended = { ...mockUser, tenant: { ...mockUser.tenant, isActive: false } };
            mockAuthRepo.findUsersByEmailActive.mockResolvedValue([suspended]);

            await expect(
                service.login({ email: 'test@example.com', password: 'SecurePass1!' }),
            ).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('register', () => {
        it('should throw ForbiddenException (public registration disabled)', async () => {
            await expect(
                service.register({
                    clinicName: 'Test',
                    firstName: 'Test',
                    lastName: 'User',
                    email: 'test@example.com',
                    password: 'SecurePass1!',
                }),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe('forgotPassword', () => {
        it('should return success message even if user does not exist', async () => {
            mockAuthRepo.findUserByEmail.mockResolvedValue(null);

            const result = await service.forgotPassword({ email: 'nonexistent@example.com' });
            expect(result.message).toContain('Si el correo existe');
            expect(mockEmailService.sendPasswordReset).not.toHaveBeenCalled();
        });

        it('should send reset email if user exists', async () => {
            mockAuthRepo.findUserByEmail.mockResolvedValue(mockUser);
            mockAuthRepo.createPasswordResetToken.mockResolvedValue(undefined);
            mockEmailService.sendPasswordReset.mockResolvedValue(undefined);

            const result = await service.forgotPassword({ email: 'test@example.com' });
            expect(result.message).toContain('Si el correo existe');
            expect(mockAuthRepo.createPasswordResetToken).toHaveBeenCalled();
            expect(mockEmailService.sendPasswordReset).toHaveBeenCalledWith(
                'test@example.com',
                expect.any(String),
            );
        });
    });

    describe('resetPassword', () => {
        it('should throw on invalid token', async () => {
            mockAuthRepo.findPasswordResetToken.mockResolvedValue(null);

            await expect(
                service.resetPassword({ token: 'bad', newPassword: 'NewPass1!' }),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw on expired token', async () => {
            mockAuthRepo.findPasswordResetToken.mockResolvedValue({
                id: 'rt-1',
                userId: 'user-1',
                token: 'valid',
                expiresAt: new Date('2020-01-01'),
                usedAt: null,
                user: mockUser,
            });

            await expect(
                service.resetPassword({ token: 'valid', newPassword: 'NewPass1!' }),
            ).rejects.toThrow(BadRequestException);
        });

        it('should reset password with valid token', async () => {
            const future = new Date();
            future.setHours(future.getHours() + 1);
            mockAuthRepo.findPasswordResetToken.mockResolvedValue({
                id: 'rt-1',
                userId: 'user-1',
                token: 'valid-token',
                expiresAt: future,
                usedAt: null,
                user: mockUser,
            });
            mockAuthRepo.changePasswordAndInvalidateSessions.mockResolvedValue(undefined);
            mockAuthRepo.markPasswordResetTokenUsed.mockResolvedValue(undefined);

            const result = await service.resetPassword({
                token: 'valid-token',
                newPassword: 'NewPass1!',
            });
            expect(result.message).toContain('restablecida exitosamente');
            expect(mockAuthRepo.changePasswordAndInvalidateSessions).toHaveBeenCalled();
            expect(mockAuthRepo.markPasswordResetTokenUsed).toHaveBeenCalledWith('rt-1');
        });
    });

    describe('changePassword', () => {
        it('should throw if current password is wrong', async () => {
            mockAuthRepo.findUserById.mockResolvedValue(mockUser);

            await expect(
                service.changePassword('user-1', {
                    currentPassword: 'WrongOld1!',
                    newPassword: 'NewPass1!',
                }),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw if new password is same as current', async () => {
            mockAuthRepo.findUserById.mockResolvedValue(mockUser);

            await expect(
                service.changePassword('user-1', {
                    currentPassword: 'SecurePass1!',
                    newPassword: 'SecurePass1!',
                }),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('verifyEmail', () => {
        it('should throw on invalid token', async () => {
            mockAuthRepo.findEmailVerificationToken.mockResolvedValue(null);

            await expect(service.verifyEmail({ token: 'bad' })).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should verify email with valid token', async () => {
            const future = new Date();
            future.setDate(future.getDate() + 1);
            mockAuthRepo.findEmailVerificationToken.mockResolvedValue({
                id: 'ev-1',
                userId: 'user-1',
                token: 'valid-token',
                expiresAt: future,
                usedAt: null,
                user: mockUser,
            });
            mockAuthRepo.markEmailVerified.mockResolvedValue(undefined);
            mockAuthRepo.markEmailVerificationTokenUsed.mockResolvedValue(undefined);

            const result = await service.verifyEmail({ token: 'valid-token' });
            expect(result.message).toContain('verificado exitosamente');
            expect(mockAuthRepo.markEmailVerified).toHaveBeenCalledWith('user-1');
        });
    });
});
