import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type {
  CreateCreditCardInput,
  CreditCardEntity,
  UpdateCreditCardInput,
} from '../../domain/entities/card-catalog';
import {
  CREDIT_CARD_REPOSITORY,
  type CreditCardRepository,
} from '../../domain/repositories/card-catalog.repository';

@Injectable()
export class CreateCreditCardCommand {
  constructor(@Inject(CREDIT_CARD_REPOSITORY) private readonly creditCards: CreditCardRepository) {}

  execute(input: CreateCreditCardInput): Promise<CreditCardEntity> {
    return this.creditCards.create(input);
  }
}

@Injectable()
export class UpdateCreditCardCommand {
  constructor(@Inject(CREDIT_CARD_REPOSITORY) private readonly creditCards: CreditCardRepository) {}

  async execute(id: string, input: UpdateCreditCardInput): Promise<CreditCardEntity> {
    const existing = await this.creditCards.findById(id);
    if (!existing) {
      throw new NotFoundException(`Credit card ${id} not found`);
    }
    return this.creditCards.update(id, input);
  }
}

@Injectable()
export class ArchiveCreditCardCommand {
  constructor(@Inject(CREDIT_CARD_REPOSITORY) private readonly creditCards: CreditCardRepository) {}

  async execute(id: string): Promise<{ id: string; archived: true }> {
    const existing = await this.creditCards.findById(id);
    if (!existing) {
      throw new NotFoundException(`Credit card ${id} not found`);
    }
    await this.creditCards.softDelete(id);
    return { id, archived: true };
  }
}
