import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestWithUser } from '../../common/types/request-with-user.types';

@Controller('admin/customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MODERATOR', 'SUPPORT')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('stage') stage?: string,
    @Query('managerId') managerId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customersService.findAll({
      status,
      stage,
      managerId,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('funnel')
  getFunnelStats(@Query('managerId') managerId?: string) {
    return this.customersService.getFunnelStats(managerId);
  }

  @Get('follow-ups')
  getUpcomingFollowUps(@Query('managerId') managerId?: string, @Query('days') days?: string) {
    return this.customersService.getUpcomingFollowUps(managerId, days ? parseInt(days, 10) : 7);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }

  @Post(':id/interactions')
  addInteraction(
    @Param('id') id: string,
    @Body() createInteractionDto: Omit<CreateInteractionDto, 'customerId'>,
    @Request() req: RequestWithUser,
  ) {
    return this.customersService.addInteraction(req.user.id, {
      ...createInteractionDto,
      customerId: id,
    } as CreateInteractionDto);
  }

  @Get(':id/interactions')
  getInteractions(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customersService.getInteractions(
      id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Patch(':id/assign/:managerId')
  assignManager(@Param('id') id: string, @Param('managerId') managerId: string) {
    return this.customersService.assignManager(id, managerId);
  }
}
