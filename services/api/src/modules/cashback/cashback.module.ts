import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { RewardsModule } from '../rewards/rewards.module';
import { CashbackController } from './cashback.controller';
import { CashbackService } from './cashback.service';

@Module({
  imports: [AuthModule, RewardsModule],
  controllers: [CashbackController],
  providers: [CashbackService],
  exports: [CashbackService],
})
export class CashbackModule {}
