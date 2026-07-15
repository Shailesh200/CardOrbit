import { Body, Controller, Get, Patch, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

class UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  country?: string;
  currency?: string;
  locale?: string;
  timezone?: string;
  avatarUrl?: string | null;
  email?: string;
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOkResponse({ description: 'Current user profile' })
  getMe(@CurrentUser() user: ConsumerPrincipal) {
    return this.users.getMe(user.id);
  }

  @Patch()
  @ApiOkResponse({ description: 'Update current user profile' })
  updateMe(@CurrentUser() user: ConsumerPrincipal, @Body() body: UpdateProfileDto) {
    return this.users.updateMe(user.id, body);
  }

  @Get('notifications')
  getNotifications(@CurrentUser() user: ConsumerPrincipal) {
    return this.users.getNotifications(user.id);
  }

  @Put('notifications')
  putNotifications(@CurrentUser() user: ConsumerPrincipal, @Body() body: unknown) {
    return this.users.putNotifications(user.id, body);
  }

  @Get('privacy')
  getPrivacy(@CurrentUser() user: ConsumerPrincipal) {
    return this.users.getPrivacy(user.id);
  }

  @Put('privacy')
  putPrivacy(@CurrentUser() user: ConsumerPrincipal, @Body() body: unknown) {
    return this.users.putPrivacy(user.id, body);
  }

  @Get('personalization')
  getPersonalization(@CurrentUser() user: ConsumerPrincipal) {
    return this.users.getRewardPersonalization(user.id);
  }

  @Put('personalization')
  putPersonalization(@CurrentUser() user: ConsumerPrincipal, @Body() body: unknown) {
    return this.users.putRewardPersonalization(user.id, body);
  }
}
