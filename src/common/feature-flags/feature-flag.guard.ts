import {
    CanActivate,
    ExecutionContext,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
    FEATURE_FLAG_METADATA_KEY,
} from './feature-flag.decorator';
import { FeatureFlagsService } from './feature-flags.service';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly featureFlagsService: FeatureFlagsService,
    ) {}

    canActivate(context: ExecutionContext): boolean {
        const flagName = this.reflector.getAllAndOverride<string>(FEATURE_FLAG_METADATA_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!flagName) {
            return true;
        }

        const enabled = this.featureFlagsService.isEnabled(flagName, false);
        if (!enabled) {
            throw new NotFoundException('Feature not enabled');
        }

        return true;
    }
}
