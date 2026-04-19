import { SetMetadata } from '@nestjs/common';

export const FEATURE_FLAG_METADATA_KEY = 'feature-flag-key';

export const RequireFeatureFlag = (flagName: string) =>
    SetMetadata(FEATURE_FLAG_METADATA_KEY, flagName);
