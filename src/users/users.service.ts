import {
    Injectable,
    ConflictException,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { PaginationQueryDto, buildPaginatedResponse, buildPaginationArgs } from '../common/dto/pagination.dto';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async findAll(tenantId: string, query: PaginationQueryDto) {
        const { skip, take, page, limit } = buildPaginationArgs(query);

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where: { tenantId },
                skip,
                take,
                orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
                select: {
                    id: true, tenantId: true, email: true, firstName: true,
                    lastName: true, role: true, phone: true, avatarUrl: true,
                    isActive: true, createdAt: true,
                },
            }),
            this.prisma.user.count({ where: { tenantId } }),
        ]);

        return buildPaginatedResponse(users, total, page, limit);
    }

    async findOne(tenantId: string, id: string) {
        const user = await this.prisma.user.findFirst({
            where: { id, tenantId },
            select: {
                id: true, tenantId: true, email: true, firstName: true,
                lastName: true, role: true, phone: true, avatarUrl: true,
                isActive: true, createdAt: true, updatedAt: true,
            },
        });
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async create(tenantId: string, dto: CreateUserDto) {
        const existing = await this.prisma.user.findUnique({
            where: { tenantId_email: { tenantId, email: dto.email.toLowerCase() } },
        });
        if (existing) throw new ConflictException('Email already registered in this clinic');

        const passwordHash = await bcrypt.hash(dto.password, 12);

        const user = await this.prisma.user.create({
            data: {
                tenantId,
                email: dto.email.toLowerCase(),
                passwordHash,
                firstName: dto.firstName,
                lastName: dto.lastName,
                role: dto.role,
                phone: dto.phone,
            },
            select: {
                id: true, tenantId: true, email: true, firstName: true,
                lastName: true, role: true, phone: true, isActive: true, createdAt: true,
            },
        });
        return user;
    }

    async update(tenantId: string, id: string, dto: UpdateUserDto) {
        await this.findOne(tenantId, id);
        const data: Record<string, unknown> = { ...dto };
        if (dto.password) {
            data.passwordHash = await bcrypt.hash(dto.password, 12);
            delete data.password;
        }
        if (dto.email) data.email = dto.email.toLowerCase();

        return this.prisma.user.update({
            where: { id },
            data,
            select: {
                id: true, tenantId: true, email: true, firstName: true,
                lastName: true, role: true, phone: true, isActive: true, updatedAt: true,
            },
        });
    }

    async remove(tenantId: string, id: string, currentUserId: string) {
        if (id === currentUserId) throw new ForbiddenException('Cannot delete your own account');
        await this.findOne(tenantId, id);
        await this.prisma.user.update({ where: { id }, data: { isActive: false } });
        return { message: 'User deactivated successfully' };
    }
}
