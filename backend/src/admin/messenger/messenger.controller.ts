import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestWithUser } from '../../common/types/request-with-user.types';
import {
  AddMessengerMembersDto,
  CreateChannelDto,
  CreateDirectConversationDto,
  SendMessengerMessageDto,
} from './dto/messenger.dto';
import { MessengerService } from './messenger.service';

@Controller('admin/messenger')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  'ADMIN',
  'SUPER_ADMIN',
  'MANAGER',
  'MODERATOR',
  'CONTENT_MANAGER',
  'SUPPORT',
  'TECHNOLOGIST',
  'TRAINEE',
)
export class MessengerController {
  constructor(private readonly messengerService: MessengerService) {}

  @Get('users')
  listUsers(@Request() req: RequestWithUser) {
    return this.messengerService.listUsers(req.user.id);
  }

  @Get('conversations')
  listConversations(@Request() req: RequestWithUser) {
    return this.messengerService.listConversations(req.user.id);
  }

  @Post('conversations/direct')
  createDirect(@Body() dto: CreateDirectConversationDto, @Request() req: RequestWithUser) {
    return this.messengerService.createDirect(req.user.id, dto);
  }

  @Post('conversations/channels')
  createChannel(@Body() dto: CreateChannelDto, @Request() req: RequestWithUser) {
    return this.messengerService.createChannel(req.user.id, dto);
  }

  @Get('conversations/:id')
  getConversation(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.messengerService.getConversation(req.user.id, id);
  }

  @Get('conversations/:id/messages')
  listMessages(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messengerService.listMessages(req.user.id, id, {
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('conversations/:id/messages')
  sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessengerMessageDto,
    @Request() req: RequestWithUser,
  ) {
    return this.messengerService.sendMessage(req.user.id, id, dto);
  }

  @Post('conversations/:id/read')
  markRead(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.messengerService.markRead(req.user.id, id);
  }

  @Post('conversations/:id/members')
  addMembers(
    @Param('id') id: string,
    @Body() dto: AddMessengerMembersDto,
    @Request() req: RequestWithUser,
  ) {
    return this.messengerService.addMembers(req.user.id, id, dto);
  }

  @Get('kanban-cards/:cardId/thread')
  getKanbanThread(@Param('cardId') cardId: string, @Request() req: RequestWithUser) {
    return this.messengerService.getOrCreateKanbanThread(req.user.id, cardId);
  }
}
