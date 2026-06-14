import {
    ConflictException,
    Injectable,
    Inject,
    NotFoundException,
} from '@nestjs/common';
import { PaginationQueryDto, buildPaginatedResponse, buildPaginationArgs } from '../../common/dto/pagination.dto';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
import { IClientRepository, CLIENT_REPOSITORY } from '../domain/client.repository';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class ClientsService {
    constructor(
        @Inject(CLIENT_REPOSITORY) private readonly clientRepo: IClientRepository,
    ) {}

    async findAll(tenantId: string, query: PaginationQueryDto) {
        const { skip, take, page, limit } = buildPaginationArgs(query);
        const { data, total } = await this.clientRepo.findAll(tenantId, { skip, take });
        return buildPaginatedResponse(data, total, page, limit);
    }

    async findOne(tenantId: string, id: string) {
        const client = await this.clientRepo.findOne(tenantId, id);
        if (!client) throw new NotFoundException('Client not found');
        return client;
    }

    async findByIdentification(tenantId: string, identification: string) {
        const normalized = identification.trim();
        if (!normalized) return null;
        return this.clientRepo.findByIdentification(tenantId, normalized);
    }

    async create(tenantId: string, dto: CreateClientDto) {
        const existing = await this.clientRepo.findByEmail(tenantId, dto.email.toLowerCase());
        if (existing) throw new ConflictException('Email already registered in this clinic');

        const rawPassword = dto.password ?? (crypto.randomUUID().replace(/-/g, '').slice(0, 16) + '!Nv1');
        const passwordHash = await bcrypt.hash(rawPassword, 12);

        return this.clientRepo.create({
            tenantId,
            email: dto.email.toLowerCase(),
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
            identification: dto.identification?.trim() || undefined,
            billingAddress: dto.billingAddress?.trim() || undefined,
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
            data.email = (dto.email as string).toLowerCase();
        }

        return this.clientRepo.update(id, data as any);
    }
}
