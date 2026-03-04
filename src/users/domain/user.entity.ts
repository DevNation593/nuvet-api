export class UserEntity {
    constructor(
        public readonly id: string,
        public readonly tenantId: string,
        public readonly branchId: string | null,
        public email: string,
        public firstName: string,
        public lastName: string,
        public role: string,
        public phone: string | null,
        public avatarUrl: string | null,
        public isActive: boolean,
        public pushToken: string | null,
        public readonly createdAt: Date,
        public updatedAt: Date,
    ) {}

    get fullName(): string {
        return `${this.firstName} ${this.lastName}`;
    }
}
