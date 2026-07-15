import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { RewardExpiryController } from './reward-expiry.controller';
import { RewardExpiryService } from './reward-expiry.service';

@Module({
  imports: [AuthModule],
  controllers: [RewardExpiryController],
  providers: [RewardExpiryService],
  exports: [RewardExpiryService],
})
export class RewardExpiryModule {}
