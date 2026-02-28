import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto, buildPaginatedResponse, buildPaginationArgs } from '../common/dto/pagination.dto';
import { UserRole } from '@nuvet/types';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class ClientsService {
    constructor(private prisma: PrismaService) { }

    async findAll(tenantId: string, query: PaginationQueryDto) {
        const { skip, take, page, limit } = buildPaginationArgs(query);
        const where = { tenantId, role: UserRole.CLIENT };
        const [clients, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    tenantId: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            this.prisma.user.count({ where }),
        ]);
        return buildPaginatedResponse(clients, total, page, limit);
    }

    async findOne(tenantId: string, id: string) {
        const client = await this.prisma.user.findFirst({
            where: { id, tenantId, role: UserRole.CLIENT },
            select: {
                id: true,
                tenantId: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!client) throw new NotFoundException('Client not found');
        return client;
    }

    async create(tenantId: string, dto: CreateClientDto) {
        const existing = await this.prisma.user.findUnique({
            where: { tenantId_email: { tenantId, email: dto.email.toLowerCase() } },
        });
        if (existing) throw new ConflictException('Email already registered in this clinic');

        const passwordHash = await bcrypt.hash(dto.password, 12);

        return this.prisma.user.create({
            data: {
                tenantId,
                email: dto.email.toLowerCase(),
                passwordHash,
                firstName: dto.firstName,
                lastName: dto.lastName,
                phone: dto.phone,
                role: UserRole.CLIENT,
            },
            select: {
                id: true,
                tenantId: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                isActive: true,
                createdAt: true,
            },
        });
    }

    async update(tenantId: string, id: string, dto: UpdateClientDto) {
        await this.findOne(tenantId, id);
        const data: Record<string, unknown> = { ...dto };
        if (dto.password) {
            data.passwordHash = await bcrypt.hash(dto.password, 12);
            delete data.password;
        }
        if (dto.email) {
            data.email = dto.email.toLowerCase();
        }

        return this.prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                tenantId: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                isActive: true,
                updatedAt: true,
            },
        });
    }
}
