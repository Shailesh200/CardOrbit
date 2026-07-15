import { Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOkResponse({ description: 'Paginated in-app notifications (syncs contextual alerts)' })
  list(
    @CurrentUser() user: ConsumerPrincipal,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.notifications.list(
      user.id,
      limit ? Number(limit) : undefined,
      offset ? Number(offset) : undefined,
    );
  }

  @Get('unread-count')
  @ApiOkResponse({ description: 'Unread notification count' })
  unreadCount(@CurrentUser() user: ConsumerPrincipal) {
    return this.notifications.unreadCount(user.id);
  }

  @Post('sync')
  @ApiOkResponse({ description: 'Refresh contextual notifications from financial signals' })
  sync(@CurrentUser() user: ConsumerPrincipal) {
    return this.notifications.syncContextual(user.id);
  }

  @Patch(':id/read')
  @ApiOkResponse({ description: 'Mark a notification as read' })
  markRead(@CurrentUser() user: ConsumerPrincipal, @Param('id') id: string) {
    return this.notifications.markRead(user.id, id);
  }

  @Post('read-all')
  @ApiOkResponse({ description: 'Mark all notifications as read' })
  markAllRead(@CurrentUser() user: ConsumerPrincipal) {
    return this.notifications.markAllRead(user.id);
  }
}
