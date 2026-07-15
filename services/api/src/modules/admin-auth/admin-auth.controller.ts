import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AdminAuthService } from './admin-auth.service';
import type { AdminPrincipal } from './admin-auth.types';
import { AdminJwtGuard } from './admin-jwt.guard';

type RequestWithAdmin = {
  adminUser?: AdminPrincipal;
};

class AdminLoginDto {
  email!: string;
  password!: string;
}

@ApiTags('admin-auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}

  @Post('login')
  @ApiOkResponse({ description: 'Admin access token' })
  login(@Body() body: AdminLoginDto) {
    return this.auth.login(body.email, body.password);
  }

  @Get('me')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Current admin principal' })
  me(@Req() request: RequestWithAdmin) {
    return this.auth.me(request.adminUser!.id);
  }
}
