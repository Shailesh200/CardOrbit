import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AssetsService } from '../assets.service';

@ApiTags('assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get('brands')
  @ApiOkResponse({
    description: 'Public slug → asset URL registry for banks, merchants, and cards',
  })
  brands() {
    return this.assets.getBrandRegistry();
  }
}
