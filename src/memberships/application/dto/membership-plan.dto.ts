import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { MembershipBillingPeriod } from '@prisma/client';

export class CreateMembershipPlanDto {
    @IsString()
    @MaxLength(64)
    name!: string;

    @IsString()
    @MaxLength(64)
    slug!: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @IsInt()
    @Min(0)
    priceCents!: number;

    @IsOptional()
    @IsString()
    @MaxLength(3)
    currency?: string;

    @IsOptional()
    @IsEnum(MembershipBillingPeriod)
    billingPeriod?: MembershipBillingPeriod;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    includedBenefits?: string[];

    @IsOptional()
    @IsArray()
    @IsUUID('all', { each: true })
    applicableSpecies?: string[];

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsInt()
    displayOrder?: number;
}

export class UpdateMembershipPlanDto {
    @IsOptional() @IsString() @MaxLength(64) name?: string;
    @IsOptional() @IsString() @MaxLength(500) description?: string;
    @IsOptional() @IsInt() @Min(0) priceCents?: number;
    @IsOptional() @IsString() @MaxLength(3) currency?: string;
    @IsOptional() @IsEnum(MembershipBillingPeriod) billingPeriod?: MembershipBillingPeriod;
    @IsOptional() @IsArray() @IsString({ each: true }) includedBenefits?: string[];
    @IsOptional() @IsArray() @IsUUID('all', { each: true }) applicableSpecies?: string[];
    @IsOptional() @IsBoolean() isActive?: boolean;
    @IsOptional() @IsInt() displayOrder?: number;
}
