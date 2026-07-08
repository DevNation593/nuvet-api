import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SubscribeToPlanDto {
    @IsUUID()
    petId!: string;

    @IsUUID()
    planId!: string;

    @IsOptional()
    @IsString()
    paymentMethodToken?: string;
}

export class CancelSubscriptionDto {
    @IsOptional()
    @IsString()
    @MaxLength(200)
    reason?: string;
}
