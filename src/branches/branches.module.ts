import { Module } from '@nestjs/common';
import { BranchesService } from './application/branches.service';
import { BranchesController } from './infrastructure/http/branches.controller';
import { PrismaBranchRepository } from './infrastructure/persistence/prisma-branch.repository';
import { BRANCH_REPOSITORY } from './domain/branch.repository';

@Module({
    controllers: [BranchesController],
    providers: [
        { provide: BRANCH_REPOSITORY, useClass: PrismaBranchRepository },
        BranchesService,
    ],
    exports: [BranchesService],
})
export class BranchesModule {}
