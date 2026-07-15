import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BookingService } from './booking.service';

@ApiTags('bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingController {
  constructor(private readonly booking: BookingService) {}

  @Get()
  @ApiOkResponse({ description: 'Booking engine foundation hub' })
  getHub(@CurrentUser() user: ConsumerPrincipal) {
    return this.booking.getHub(user.id);
  }

  @Post('search')
  @ApiOkResponse({ description: 'Unified booking search (flight or hotel)' })
  search(@CurrentUser() user: ConsumerPrincipal, @Body() body: unknown) {
    return this.booking.search(user.id, body);
  }

  @Post('flights/search')
  @ApiOkResponse({ description: 'Flight search with card-aware pricing' })
  searchFlights(@CurrentUser() user: ConsumerPrincipal, @Body() body: unknown) {
    return this.booking.searchFlights(user.id, body);
  }

  @Post('flights/availability')
  @ApiOkResponse({ description: 'Recheck seat availability for a flight offer' })
  flightAvailability(@CurrentUser() user: ConsumerPrincipal, @Body() body: unknown) {
    return this.booking.checkAvailability(user.id, body);
  }

  @Post('flights/validate')
  @ApiOkResponse({ description: 'Revalidate fare / price for a flight offer' })
  validateFare(@CurrentUser() user: ConsumerPrincipal, @Body() body: unknown) {
    return this.booking.validateFare(user.id, body);
  }

  @Post('hotels/search')
  @ApiOkResponse({ description: 'Hotel search with loyalty-aware ranking' })
  searchHotels(@CurrentUser() user: ConsumerPrincipal, @Body() body: unknown) {
    return this.booking.searchHotels(user.id, body);
  }

  @Post('hotels/availability')
  @ApiOkResponse({ description: 'Recheck room availability for a hotel offer' })
  hotelAvailability(@CurrentUser() user: ConsumerPrincipal, @Body() body: unknown) {
    return this.booking.checkHotelAvailability(user.id, body);
  }

  @Post('hotels/validate')
  @ApiOkResponse({ description: 'Revalidate hotel rate for an offer' })
  validateHotelRate(@CurrentUser() user: ConsumerPrincipal, @Body() body: unknown) {
    return this.booking.validateHotelRate(user.id, body);
  }

  @Post('hotels/loyalty/optimize')
  @ApiOkResponse({ description: 'Compare card, chain loyalty, and portal earn paths' })
  optimizeLoyalty(@CurrentUser() user: ConsumerPrincipal, @Body() body: unknown) {
    return this.booking.optimizeLoyalty(user.id, body);
  }

  @Post('pricing')
  @ApiOkResponse({ description: 'Explainable effective-cost pricing for an offer' })
  price(@CurrentUser() user: ConsumerPrincipal, @Body() body: unknown) {
    return this.booking.price(user.id, body);
  }

  @Post('payment/optimize')
  @ApiOkResponse({ description: 'Rank portfolio cards for paying a travel offer' })
  optimizePayment(@CurrentUser() user: ConsumerPrincipal, @Body() body: unknown) {
    return this.booking.optimizePayment(user.id, body);
  }

  @Post('channels/recommend')
  @ApiOkResponse({
    description: 'Rank CardOrbit vs issuer travel portal booking channels',
  })
  recommendChannels(@CurrentUser() user: ConsumerPrincipal, @Body() body: unknown) {
    return this.booking.recommendChannels(user.id, body);
  }

  @Post('channels/handoff')
  @ApiOkResponse({ description: 'Record bank portal handoff click and return deep link' })
  portalHandoff(@CurrentUser() user: ConsumerPrincipal, @Body() body: unknown) {
    return this.booking.recordPortalHandoff(user.id, body);
  }
}
