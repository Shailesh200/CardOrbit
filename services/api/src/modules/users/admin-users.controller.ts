import { Controller, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { UsersService } from './users.service';

@ApiTags('admin-users')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOkResponse({ description: 'Paginated consumer users or email lookup' })
  async listOrLookup(
    @Query('email') email?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (email?.trim()) {
      return this.users.adminGetByEmail(email);
    }
    return this.users.adminListUsers({
      search,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Read-only consumer profile for support' })
  byId(@Param('id') id: string) {
    return this.users.adminGetById(id);
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'Dev-only hard delete of consumer user' })
  deleteById(@Param('id') id: string) {
    return this.users.adminDeleteUser(id);
  }
}
