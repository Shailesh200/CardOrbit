import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { RewardsModule } from '../rewards/rewards.module';
import { TravelHubModule } from '../travel-hub/travel-hub.module';
import { TripPlannerController } from './trip-planner.controller';
import { TripPlannerService } from './trip-planner.service';

@Module({
  imports: [AuthModule, TravelHubModule, RewardsModule],
  controllers: [TripPlannerController],
  providers: [TripPlannerService],
})
export class TripPlannerModule {}
