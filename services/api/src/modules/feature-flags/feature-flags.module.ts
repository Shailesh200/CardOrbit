import { Global, Module } from '@nestjs/common';

import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { AdminFeatureFlagsController } from './admin-feature-flags.controller';
import { AdminExperimentsController } from './admin-experiments.controller';
import { ExperimentsController } from './experiments.controller';
import { ExperimentsService } from './experiments.service';
import { FeatureFlagsController } from './feature-flags.controller';
import { FeatureFlagsService } from './feature-flags.service';

/**
 * Intentionally does not import AuthModule: Auth → Notifications → FeatureFlags
 * would form a circular graph and leave AuthModule undefined at bootstrap.
 * OptionalJwtAuthGuard is registered locally; JwtStrategy still comes from AuthModule in AppModule.
 */
@Global()
@Module({
  controllers: [
    FeatureFlagsController,
    AdminFeatureFlagsController,
    ExperimentsController,
    AdminExperimentsController,
  ],
  providers: [FeatureFlagsService, ExperimentsService, OptionalJwtAuthGuard],
  exports: [FeatureFlagsService, ExperimentsService],
})
export class FeatureFlagsModule {}
