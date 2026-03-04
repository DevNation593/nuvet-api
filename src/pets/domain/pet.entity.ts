import { UserRole } from '@nuvet/types';

export class PetOwnerEntity {
    constructor(
        public readonly id: string,
        public readonly firstName: string,
        public readonly lastName: string,
        public readonly email: string,
        public readonly phone: string | null,
    ) {}

    get fullName(): string {
        return `${this.firstName} ${this.lastName}`;
    }
}

export class PetEntity {
    constructor(
        public readonly id: string,
        public readonly tenantId: string,
        public readonly ownerId: string,
        public name: string,
        public species: string,
        public breed: string | null,
        public sex: string,
        public birthDate: Date | null,
        public weight: number | null,
        public photoUrl: string | null,
        public microchip: string | null,
        public color: string | null,
        public isNeutered: boolean,
        public allergies: string | null,
        public notes: string | null,
        public isActive: boolean,
        public readonly createdAt: Date,
        public updatedAt: Date,
    ) {}
}
