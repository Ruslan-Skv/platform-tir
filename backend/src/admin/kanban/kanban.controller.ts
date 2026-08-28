import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestWithUser } from '../../common/types/request-with-user.types';
import {
  CreateKanbanBoardDto,
  CreateKanbanCardDto,
  CreateKanbanColumnDto,
  CreateKanbanCommentDto,
  MoveKanbanCardDto,
  ReorderKanbanColumnsDto,
  UpdateKanbanBoardDto,
  UpdateKanbanCardDto,
  UpdateKanbanColumnDto,
} from './dto/kanban.dto';
import { KanbanService } from './kanban.service';

@Controller('admin/kanban')
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
export class KanbanController {
  constructor(private readonly kanbanService: KanbanService) {}

  @Get('boards')
  listBoards() {
    return this.kanbanService.listBoards();
  }

  @Post('boards')
  createBoard(@Body() dto: CreateKanbanBoardDto, @Request() req: RequestWithUser) {
    return this.kanbanService.createBoard(req.user.id, dto);
  }

  @Get('trash/count')
  trashCount() {
    return this.kanbanService.trashCount().then((count) => ({ count }));
  }

  @Get('trash')
  findTrash(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.kanbanService.findTrash({
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('boards/:id')
  getBoard(@Param('id') id: string) {
    return this.kanbanService.getBoard(id);
  }

  @Patch('boards/:id')
  updateBoard(@Param('id') id: string, @Body() dto: UpdateKanbanBoardDto) {
    return this.kanbanService.updateBoard(id, dto);
  }

  @Delete('boards/:id')
  deleteBoard(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.kanbanService.deleteBoard(id, req.user.id);
  }

  @Post('boards/:id/restore')
  restoreBoard(@Param('id') id: string) {
    return this.kanbanService.restoreBoard(id);
  }

  @Post('boards/:id/columns')
  createColumn(@Param('id') id: string, @Body() dto: CreateKanbanColumnDto) {
    return this.kanbanService.createColumn(id, dto);
  }

  @Post('boards/:id/columns/reorder')
  reorderColumns(@Param('id') id: string, @Body() dto: ReorderKanbanColumnsDto) {
    return this.kanbanService.reorderColumns(id, dto.columnIds);
  }

  @Patch('columns/:id')
  updateColumn(@Param('id') id: string, @Body() dto: UpdateKanbanColumnDto) {
    return this.kanbanService.updateColumn(id, dto);
  }

  @Delete('columns/:id')
  deleteColumn(@Param('id') id: string) {
    return this.kanbanService.deleteColumn(id);
  }

  @Post('columns/:id/cards')
  createCard(
    @Param('id') id: string,
    @Body() dto: CreateKanbanCardDto,
    @Request() req: RequestWithUser,
  ) {
    return this.kanbanService.createCard(id, req.user.id, dto);
  }

  @Patch('cards/:id')
  updateCard(
    @Param('id') id: string,
    @Body() dto: UpdateKanbanCardDto,
    @Request() req: RequestWithUser,
  ) {
    return this.kanbanService.updateCard(id, req.user.id, dto);
  }

  @Post('cards/:id/move')
  moveCard(
    @Param('id') id: string,
    @Body() dto: MoveKanbanCardDto,
    @Request() req: RequestWithUser,
  ) {
    return this.kanbanService.moveCard(id, req.user.id, dto);
  }

  @Delete('cards/:id')
  deleteCard(@Param('id') id: string) {
    return this.kanbanService.deleteCard(id);
  }

  @Post('cards/:id/comments')
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateKanbanCommentDto,
    @Request() req: RequestWithUser,
  ) {
    return this.kanbanService.addComment(id, req.user.id, dto);
  }

  @Delete('comments/:id')
  deleteComment(@Param('id') id: string) {
    return this.kanbanService.deleteComment(id);
  }
}
