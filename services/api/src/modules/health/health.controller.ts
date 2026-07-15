import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOkResponse({ description: 'Service and database health' })
  async check() {
    const dbHealthy = await this.prisma.isHealthy();
    if (!dbHealthy) {
      throw new ServiceUnavailableException({
        status: 'degraded',
        database: 'unavailable',
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: 'ok',
      database: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
