import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ADMIN_PORTAL_CONFIG } from '@cardwise/admin-config';

import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';

@ApiTags('admin-sdui')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/sdui')
export class AdminSduiController {
  @Get('config')
  @ApiOkResponse({ description: 'Config-driven admin portal SDUI schema' })
  getConfig() {
    return ADMIN_PORTAL_CONFIG;
  }
}
