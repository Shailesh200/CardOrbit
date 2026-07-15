import { Controller, Get, NotFoundException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { captureException, isSentryEnabled } from '../../infrastructure/sentry/sentry';

@ApiExcludeController()
@Controller('debug')
export class DebugController {
  @Get('sentry-test')
  sentryTest() {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }

    const error = new Error('CardWise Sentry verification error (M-005)');
    captureException(error);

    return {
      captured: isSentryEnabled(),
      message: isSentryEnabled()
        ? 'Test exception sent to Sentry'
        : 'SENTRY_DSN unset — exception not forwarded (expected in local)',
    };
  }
}
