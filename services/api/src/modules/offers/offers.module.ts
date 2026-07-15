import { Module } from '@nestjs/common';

import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AuthModule } from '../auth/auth.module';
import { UserCardsModule } from '../user-cards/user-cards.module';
import {
  AssignOfferCardCommand,
  AssignOfferMerchantCommand,
  CreateOfferCommand,
  UpdateOfferCommand,
} from './application/commands/offer.commands';
import { ListActiveOffersQuery } from './application/queries/list-active-offers.query';
import { AdminOffersController } from './controllers/admin-offers.controller';
import { OffersController } from './controllers/offers.controller';
import { OFFER_REPOSITORY } from './domain/repositories/offer.repository';
import { PrismaOfferRepository } from './infrastructure/prisma-offer.repository';
import { OfferMatchingService } from './offer-matching.service';

@Module({
  imports: [AdminAuthModule, AuthModule, UserCardsModule],
  controllers: [AdminOffersController, OffersController],
  providers: [
    { provide: OFFER_REPOSITORY, useClass: PrismaOfferRepository },
    PrismaOfferRepository,
    ListActiveOffersQuery,
    OfferMatchingService,
    CreateOfferCommand,
    UpdateOfferCommand,
    AssignOfferCardCommand,
    AssignOfferMerchantCommand,
  ],
  exports: [OFFER_REPOSITORY, ListActiveOffersQuery, OfferMatchingService],
})
export class OffersModule {}
