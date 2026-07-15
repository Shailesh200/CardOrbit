import { Module, forwardRef } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { JobsModule } from '../jobs/jobs.module';
import { MailSyncController } from './mail-sync.controller';
import { MailSyncService } from './mail-sync.service';

@Module({
  imports: [forwardRef(() => AuthModule), JobsModule],
  controllers: [MailSyncController],
  providers: [MailSyncService],
  exports: [MailSyncService],
})
export class MailSyncModule {}
