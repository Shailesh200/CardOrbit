import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FinancialCalendarService } from './financial-calendar.service';

@ApiTags('calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calendar')
export class FinancialCalendarController {
  constructor(private readonly calendar: FinancialCalendarService) {}

  @Get()
  @ApiOkResponse({ description: 'Unified financial calendar month view' })
  getMonth(
    @CurrentUser() user: ConsumerPrincipal,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('types') types?: string,
  ) {
    return this.calendar.getMonth(user.id, { year, month, types });
  }

  @Get('agenda')
  @ApiOkResponse({ description: 'Upcoming financial calendar agenda' })
  getAgenda(
    @CurrentUser() user: ConsumerPrincipal,
    @Query('days') days?: string,
    @Query('types') types?: string,
  ) {
    return this.calendar.getAgenda(user.id, { days, types });
  }

  @Get('timeline')
  @ApiOkResponse({ description: 'Financial activity timeline' })
  getTimeline(
    @CurrentUser() user: ConsumerPrincipal,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('category') category?: string,
  ) {
    return this.calendar.getTimeline(user.id, { page, pageSize, category });
  }

  @Get('reminders')
  @ApiOkResponse({ description: 'List custom calendar reminders' })
  listReminders(@CurrentUser() user: ConsumerPrincipal) {
    return this.calendar.listReminders(user.id);
  }

  @Post('reminders')
  @ApiOkResponse({ description: 'Create a custom calendar reminder' })
  createReminder(@CurrentUser() user: ConsumerPrincipal, @Body() body: unknown) {
    return this.calendar.createReminder(user.id, body);
  }

  @Patch('reminders/:id')
  @ApiOkResponse({ description: 'Update a custom calendar reminder' })
  updateReminder(
    @CurrentUser() user: ConsumerPrincipal,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.calendar.updateReminder(user.id, id, body);
  }

  @Delete('reminders/:id')
  @ApiOkResponse({ description: 'Delete a custom calendar reminder' })
  deleteReminder(@CurrentUser() user: ConsumerPrincipal, @Param('id') id: string) {
    return this.calendar.deleteReminder(user.id, id);
  }
}
