import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupportChatService } from './support-chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../common/types/request-with-user.types';

@ApiTags('support-chat')
@Controller('support')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SupportChatController {
  constructor(private readonly supportChat: SupportChatService) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Создать диалог с поддержкой' })
  createConversation(@Request() req: RequestWithUser) {
    return this.supportChat.createConversation(req.user.id);
  }

  @Get('conversations/check-new-replies')
  @ApiOperation({ summary: 'Проверить диалоги с новыми ответами поддержки' })
  checkNewReplies(@Request() req: RequestWithUser, @Query('since') since?: string) {
    const sinceDate = since ? new Date(since) : new Date(0);
    if (isNaN(sinceDate.getTime())) {
      return { conversationIds: [] };
    }
    return this.supportChat
      .getConversationsWithNewSupportReplies(req.user.id, sinceDate)
      .then((conversationIds) => ({ conversationIds }));
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Мои диалоги или все диалоги (для поддержки)' })
  getConversations(
    @Request() req: RequestWithUser,
    @Query('asSupport') asSupport?: string,
    @Query('status') status?: string,
  ) {
    const isSupport =
      req.user.role && ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT'].includes(req.user.role);
    if (isSupport && asSupport === 'true') {
      return this.supportChat.findAllConversationsForSupport(req.user.id, req.user.role, status);
    }
    return this.supportChat.findMyConversations(req.user.id);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Получить диалог по ID' })
  getConversation(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.supportChat.findOne(id, req.user.id, req.user.role);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Сообщения диалога' })
  getMessages(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.supportChat.getMessages(id, req.user.id, req.user.role);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Отправить сообщение' })
  sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Request() req: RequestWithUser,
  ) {
    return this.supportChat.sendMessage(id, req.user.id, req.user.role, dto);
  }

  @Patch('conversations/:id')
  @ApiOperation({ summary: 'Обновить диалог (назначить, статус) — только для поддержки' })
  updateConversation(
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
    @Request() req: RequestWithUser,
  ) {
    return this.supportChat.updateConversation(id, req.user.id, req.user.role, dto);
  }
}
