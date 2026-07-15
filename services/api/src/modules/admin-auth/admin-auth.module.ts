import { Module } from '@nestjs/common';

import { AdminAuditService } from './admin-audit.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { AdminJwtGuard } from './admin-jwt.guard';

@Module({
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminJwtGuard, AdminAuditService, AdminBootstrapService],
  exports: [AdminJwtGuard, AdminAuditService, AdminAuthService],
})
export class AdminAuthModule {}
