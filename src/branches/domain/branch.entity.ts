export class BranchEntity {
    constructor(
        public readonly id: string,
        public readonly tenantId: string,
        public name: string,
        public address: string | null,
        public phone: string | null,
        public email: string | null,
        public logoUrl: string | null,
        public website: string | null,
        public isMain: boolean,
        public isActive: boolean,
        public readonly createdAt: Date,
        public updatedAt: Date,
    ) {}
}
