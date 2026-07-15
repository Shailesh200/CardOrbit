import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { JobEventsService } from './job-events.service';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  imports: [AiModule],
  controllers: [JobsController],
  providers: [JobsService, JobEventsService],
  exports: [JobsService, JobEventsService],
})
export class JobsModule {}
