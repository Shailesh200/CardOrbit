import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { MailSyncModule } from '../mail-sync/mail-sync.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthTokenService } from './auth-token.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

/**
 * Does not import NotificationsModule — Auth → Notifications → Milestones → Auth
 * was an undefined-module cycle at bootstrap. NotificationsModule is @Global and
 * registered before AuthModule in AppModule so AuthService can still inject it.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'consumer-jwt' }),
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'change-me-use-openssl-rand-base64-32',
    }),
    forwardRef(() => MailSyncModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthTokenService, JwtStrategy, JwtAuthGuard, OptionalJwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, AuthTokenService, OptionalJwtAuthGuard],
})
export class AuthModule {}
