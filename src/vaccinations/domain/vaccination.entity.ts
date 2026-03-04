export class VaccinationEntity {
    constructor(
        public readonly id: string,
        public readonly tenantId: string,
        public petId: string,
        public vetId: string,
        public appointmentId: string | null,
        public vaccineName: string,
        public manufacturer: string | null,
        public batchNumber: string | null,
        public dose: number,
        public administeredAt: Date,
        public nextDueAt: Date | null,
        public status: string,
        public notes: string | null,
        public readonly createdAt: Date,
        public updatedAt: Date,
    ) {}

    get isOverdue(): boolean {
        return this.nextDueAt !== null && this.nextDueAt < new Date();
    }
}
