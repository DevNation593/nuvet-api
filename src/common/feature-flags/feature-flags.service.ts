import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FeatureFlagsService {
    private readonly byName: Record<string, boolean>;

    constructor(private readonly configService: ConfigService) {
        const csv = (this.configService.get<string>('FEATURE_FLAGS') ?? '')
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean);

        const jsonRaw = this.configService.get<string>('FEATURE_FLAGS_JSON') ?? '{}';
        let fromJson: Record<string, boolean> = {};

        try {
            const parsed = JSON.parse(jsonRaw) as Record<string, unknown>;
            fromJson = Object.fromEntries(
                Object.entries(parsed).map(([key, value]) => [key, Boolean(value)]),
            );
        } catch {
            fromJson = {};
        }

        const fromCsv = Object.fromEntries(csv.map((flag) => [flag, true]));

        this.byName = {
            ...fromJson,
            ...fromCsv,
        };
    }

    isEnabled(flagName: string, defaultValue = false): boolean {
        if (Object.prototype.hasOwnProperty.call(this.byName, flagName)) {
            return this.byName[flagName];
        }
        return defaultValue;
    }
}
