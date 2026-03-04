export class AppointmentEntity {
    constructor(
        public readonly id: string,
        public readonly tenantId: string,
        public readonly branchId: string | null,
        public petId: string,
        public vetId: string | null,
        public groomerId: string | null,
        public type: string,
        public status: string,
        public scheduledAt: Date,
        public durationMinutes: number,
        public notes: string | null,
        public cancelReason: string | null,
        public readonly createdAt: Date,
        public updatedAt: Date,
    ) {}

    get endsAt(): Date {
        return new Date(this.scheduledAt.getTime() + this.durationMinutes * 60_000);
    }
}
