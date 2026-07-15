import { Module } from '@nestjs/common';

import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AssetStorageService } from './asset-storage.service';
import { AssetsService } from './assets.service';
import { AdminAssetsController } from './controllers/admin-assets.controller';
import { AssetsController } from './controllers/assets.controller';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminAssetsController, AssetsController],
  providers: [AssetsService, AssetStorageService],
  exports: [AssetsService, AssetStorageService],
})
export class AssetsModule {}
