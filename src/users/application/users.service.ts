import {
    Injectable,
    ConflictException,
    NotFoundException,
    ForbiddenException,
    Inject,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { PaginationQueryDto, buildPaginatedResponse, buildPaginationArgs } from '../../common/dto/pagination.dto';
import { IUserRepository, USER_REPOSITORY, CreateUserData } from '../domain/user.repository';

@Injectable()
export class UsersService {
    constructor(
        @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    ) { }

    async findAll(tenantId: string, query: PaginationQueryDto) {
        const { skip, take, page, limit } = buildPaginationArgs(query);
        const { data, total } = await this.userRepo.findAll(tenantId, {
            skip, take, sortBy: query.sortBy, sortOrder: query.sortOrder,
        });
        return buildPaginatedResponse(data, total, page, limit);
    }

    async findOne(tenantId: string, id: string) {
        const user = await this.userRepo.findOne(tenantId, id);
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async create(tenantId: string, dto: CreateUserDto) {
        const existing = await this.userRepo.findByEmail(tenantId, dto.email.toLowerCase());
        if (existing) throw new ConflictException('Email already registered in this clinic');

        const passwordHash = await bcrypt.hash(dto.password, 12);

        return this.userRepo.create({
            tenantId,
            email: dto.email.toLowerCase(),
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
            role: dto.role,
            phone: dto.phone,
        } as CreateUserData);
    }

    async update(tenantId: string, id: string, dto: UpdateUserDto) {
        await this.findOne(tenantId, id);
        const data: Record<string, unknown> = { ...dto };
        if (dto.password) {
            data.passwordHash = await bcrypt.hash(dto.password, 12);
            delete data.password;
        }
        if (dto.email) data.email = (dto.email as string).toLowerCase();

        return this.userRepo.update(id, data as any);
    }

    async remove(tenantId: string, id: string, currentUserId: string) {
        if (id === currentUserId) throw new ForbiddenException('Cannot delete your own account');
        await this.findOne(tenantId, id);
        await this.userRepo.softDelete(id);
        return { message: 'User deactivated successfully' };
    }
}