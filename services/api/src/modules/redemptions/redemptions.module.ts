import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { RewardWalletModule } from '../reward-wallet/reward-wallet.module';
import { RedemptionsController } from './redemptions.controller';
import { RedemptionsService } from './redemptions.service';

@Module({
  imports: [AuthModule, RewardWalletModule],
  controllers: [RedemptionsController],
  providers: [RedemptionsService],
  exports: [RedemptionsService],
})
export class RedemptionsModule {}
