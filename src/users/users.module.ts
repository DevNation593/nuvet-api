import { Module } from '@nestjs/common';
import { UsersController } from './infrastructure/http/users.controller';
import { UsersService } from './application/users.service';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { USER_REPOSITORY } from './domain/user.repository';

@Module({
    controllers: [UsersController],
    providers: [
        { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
        UsersService,
    ],
    exports: [UsersService],
})
export class UsersModule { }