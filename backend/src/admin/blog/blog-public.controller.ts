import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BlogService } from './blog.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ToggleLikeDto } from './dto/toggle-like.dto';
import { OptionalJwtAuthGuard } from '../../auth/guards/optional-jwt-auth.guard';
import type { RequestWithUser } from '../../common/types/request-with-user.types';

@ApiTags('blog')
@Controller('blog')
export class BlogPublicController {
  constructor(private readonly blogService: BlogService) {}

  @Get('posts')
  @ApiOperation({ summary: 'Получить опубликованные посты блога (публичный)' })
  getPublishedPosts(
    @Query('category') categorySlug?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.blogService.getPublishedPosts({
      categorySlug,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 12,
    });
  }

  @Get('posts/slug/:slug')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Получить опубликованный пост по slug (публичный)' })
  getPublishedPostBySlug(
    @Param('slug') slug: string,
    @Query('guestId') guestId?: string,
    @Req() req?: RequestWithUser,
  ) {
    const userId = req?.user?.id;
    const likerId = userId || (guestId ? `g_${guestId}` : undefined);
    return this.blogService.getPublishedPostBySlug(slug, likerId);
  }

  @Post('posts/:postId/like')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Поставить/снять лайк посту' })
  toggleLike(
    @Param('postId') postId: string,
    @Body() dto: ToggleLikeDto,
    @Req() req?: RequestWithUser,
  ) {
    const userId = req?.user?.id;
    return this.blogService.toggleLike(postId, userId, dto.guestId);
  }

  @Post('posts/:postId/comments')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Добавить комментарий к посту' })
  createComment(
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
    @Req() req?: RequestWithUser,
  ) {
    const userId = req?.user?.id;
    return this.blogService.createComment(
      postId,
      {
        content: dto.content,
        authorName: dto.authorName,
        authorEmail: dto.authorEmail,
        parentId: dto.parentId,
      },
      userId,
    );
  }

  @Get('categories')
  @ApiOperation({ summary: 'Получить категории блога (публичный)' })
  getCategories() {
    return this.blogService.getPublicCategories();
  }
}
