import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  Redirect,
  Res,
  UseGuards,
  forwardRef,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { MailSyncService } from '../mail-sync/mail-sync.service';
import { AuthService } from './auth.service';
import type { ConsumerPrincipal } from './auth.types';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { verifyOAuthState } from './oauth-state';

type RedirectReply = {
  redirect: (url: string, status?: number) => unknown;
};

class SignupDto {
  email!: string;
  password!: string;
  firstName?: string;
  lastName?: string;
}

class LoginDto {
  email!: string;
  password!: string;
}

class TokenDto {
  verificationToken?: string;
  token?: string;
  refreshToken?: string;
  password?: string;
  email?: string;
}

class ChangePasswordDto {
  currentPassword!: string;
  newPassword!: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(forwardRef(() => MailSyncService))
    private readonly mailSync: MailSyncService,
  ) {}

  @Post('signup')
  @ApiOkResponse({ description: 'Create consumer account' })
  signup(@Body() body: SignupDto) {
    return this.auth.signup(body);
  }

  @Post('verify-email')
  verifyEmail(@Body() body: TokenDto) {
    return this.auth.verifyEmail(body.verificationToken || body.token || '');
  }

  @Post('resend-verification')
  resendVerification(@Body() body: TokenDto) {
    return this.auth.resendVerification(body.email || '');
  }

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.auth.login(body.email, body.password);
  }

  @Post('refresh')
  refresh(@Body() body: TokenDto) {
    return this.auth.refresh(body.refreshToken || '');
  }

  @Post('logout')
  logout(@Body() body: TokenDto) {
    return this.auth.logout(body.refreshToken || '');
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  logoutAll(@CurrentUser() user: ConsumerPrincipal) {
    return this.auth.logoutAll(user.id);
  }

  @Post('forgot-password')
  forgotPassword(@Body() body: TokenDto) {
    return this.auth.forgotPassword(body.email || '');
  }

  @Post('reset-password')
  resetPassword(@Body() body: TokenDto) {
    return this.auth.resetPassword(body.token || '', body.password || '');
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  changePassword(@CurrentUser() user: ConsumerPrincipal, @Body() body: ChangePasswordDto) {
    return this.auth.changePassword(user.id, body.currentPassword, body.newPassword);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  me(@CurrentUser() user: ConsumerPrincipal) {
    return this.auth.me(user.id);
  }

  @Get('oauth/google')
  @Redirect()
  oauthGoogle() {
    return { url: this.auth.googleAuthUrl(), statusCode: 302 };
  }

  @Get('oauth/callback')
  async oauthCallback(
    @Query('code') code: string,
    @Query('state') state: string | undefined,
    @Res() reply: RedirectReply,
  ) {
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    if (!code) {
      return reply.redirect(`${appUrl}/login?error=missing_code`, 302);
    }

    let intent: 'login' | 'link_mailbox' = 'login';
    let linkUserId: string | undefined;
    try {
      const parsed = verifyOAuthState(state);
      intent = parsed.intent;
      linkUserId = parsed.userId;
    } catch {
      return reply.redirect(`${appUrl}/login?error=oauth_failed`, 302);
    }

    try {
      if (intent === 'link_mailbox' && linkUserId) {
        await this.mailSync.completeLinkMailbox(linkUserId, code);
        return reply.redirect(`${appUrl}/account/settings?mailbox=connected`, 302);
      }

      const result = await this.auth.googleCallback(code);
      const params = new URLSearchParams({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      return reply.redirect(`${appUrl}/oauth/callback?${params.toString()}`, 302);
    } catch {
      if (intent === 'link_mailbox') {
        return reply.redirect(`${appUrl}/account/settings?mailbox=error`, 302);
      }
      return reply.redirect(`${appUrl}/login?error=oauth_failed`, 302);
    }
  }
}
