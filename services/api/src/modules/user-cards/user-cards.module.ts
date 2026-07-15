import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { MailSyncModule } from '../mail-sync/mail-sync.module';
import { CardsCatalogController, UserCardsController } from './user-cards.controller';
import { UserCardsService } from './user-cards.service';

@Module({
  imports: [AuthModule, MailSyncModule],
  controllers: [UserCardsController, CardsCatalogController],
  providers: [UserCardsService],
  exports: [UserCardsService],
})
export class UserCardsModule {}
