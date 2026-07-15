import { Module } from '@nestjs/common';

import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AdminSduiController } from './admin-sdui.controller';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminSduiController],
})
export class AdminSduiModule {}
