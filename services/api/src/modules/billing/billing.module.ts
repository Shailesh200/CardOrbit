import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import {
  BillingCalendarController,
  BillsController,
  StatementsController,
} from './billing.controller';
import { BillingService } from './billing.service';

@Module({
  imports: [AuthModule],
  controllers: [StatementsController, BillsController, BillingCalendarController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
