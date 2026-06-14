export class ClientEntity {
    constructor(
        public readonly id: string,
        public readonly tenantId: string,
        public email: string,
        public firstName: string,
        public lastName: string,
        public phone: string | null,
        public avatarUrl: string | null,
        public isActive: boolean,
        public readonly createdAt: Date,
        public updatedAt: Date,
        public identification: string | null = null,
        public billingAddress: string | null = null,
    ) {}

    get fullName(): string {
        return `${this.firstName} ${this.lastName}`;
    }
}
