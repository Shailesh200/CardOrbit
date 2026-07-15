import { Module } from '@nestjs/common';

import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import {
  ArchiveCreditCardCommand,
  CreateCreditCardCommand,
  UpdateCreditCardCommand,
} from './application/commands/credit-card.commands';
import { ListBanksQuery } from './application/queries/list-banks.query';
import { ListCreditCardsQuery } from './application/queries/list-credit-cards.query';
import { AdminCardsController } from './controllers/admin-cards.controller';
import {
  BANK_REPOSITORY,
  CARD_NETWORK_REPOSITORY,
  CREDIT_CARD_REPOSITORY,
} from './domain/repositories/card-catalog.repository';
import {
  PrismaBankRepository,
  PrismaCardNetworkRepository,
  PrismaCreditCardRepository,
} from './infrastructure/prisma-card-catalog.repository';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminCardsController],
  providers: [
    { provide: BANK_REPOSITORY, useClass: PrismaBankRepository },
    { provide: CARD_NETWORK_REPOSITORY, useClass: PrismaCardNetworkRepository },
    { provide: CREDIT_CARD_REPOSITORY, useClass: PrismaCreditCardRepository },
    PrismaBankRepository,
    PrismaCardNetworkRepository,
    PrismaCreditCardRepository,
    ListBanksQuery,
    ListCreditCardsQuery,
    CreateCreditCardCommand,
    UpdateCreditCardCommand,
    ArchiveCreditCardCommand,
  ],
  exports: [BANK_REPOSITORY, CARD_NETWORK_REPOSITORY, CREDIT_CARD_REPOSITORY],
})
export class CardsModule {}
