import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
import { TravelHubModule } from '../travel-hub/travel-hub.module';
import { BOOKING_SUPPLIER, BOOKING_SUPPLIERS } from './booking.supplier';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { MockBookingSupplier, MockOtaBookingSupplier } from './mock-booking.supplier';

@Module({
  imports: [AuthModule, FeatureFlagsModule, TravelHubModule],
  controllers: [BookingController],
  providers: [
    BookingService,
    MockBookingSupplier,
    MockOtaBookingSupplier,
    {
      provide: BOOKING_SUPPLIER,
      useExisting: MockBookingSupplier,
    },
    {
      provide: BOOKING_SUPPLIERS,
      useFactory: (gds: MockBookingSupplier, ota: MockOtaBookingSupplier) => [gds, ota],
      inject: [MockBookingSupplier, MockOtaBookingSupplier],
    },
  ],
  exports: [BookingService],
})
export class BookingModule {}
