import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MailSyncService } from './mail-sync.service';

class SyncMailboxDto {
  mailboxId?: string;
  userCardId?: string;
}

@ApiTags('mail-sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mail-sync')
export class MailSyncController {
  constructor(private readonly mailSync: MailSyncService) {}

  @Get('mailboxes')
  @ApiOkResponse({ description: 'List connected Google mailboxes' })
  list(@CurrentUser() user: ConsumerPrincipal) {
    return this.mailSync.listMailboxes(user.id);
  }

  @Get('oauth/url')
  @ApiOkResponse({ description: 'Google OAuth URL to link an additional mailbox' })
  linkUrl(@CurrentUser() user: ConsumerPrincipal) {
    return { url: this.mailSync.linkMailboxAuthUrl(user.id) };
  }

  @Post('sync')
  @ApiOkResponse({ description: 'Enqueue Gmail transaction sync' })
  sync(@CurrentUser() user: ConsumerPrincipal, @Body() body: SyncMailboxDto) {
    return this.mailSync.enqueueSync(user.id, {
      mailboxId: body.mailboxId,
      userCardId: body.userCardId,
    });
  }

  @Get('jobs/:id')
  @ApiOkResponse({ description: 'Poll Gmail sync job progress for the current user' })
  jobStatus(@CurrentUser() user: ConsumerPrincipal, @Param('id') id: string) {
    return this.mailSync.getSyncJob(user.id, id);
  }

  @Post('mailboxes/:id/disconnect')
  @ApiOkResponse({ description: 'Disconnect a Google mailbox' })
  disconnect(@CurrentUser() user: ConsumerPrincipal, @Param('id') id: string) {
    return this.mailSync.disconnectMailbox(user.id, id);
  }
}
