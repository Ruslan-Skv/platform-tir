import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OriginGuard } from '../../common/guards/origin.guard';
import { BlogService } from './blog.service';
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
    @Query('tag') tag?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.blogService.getPublishedPosts({
      categorySlug,
      search,
      tag,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 12,
    });
  }

  @Get('tags')
  @ApiOperation({ summary: 'Теги опубликованных статей с количеством' })
  getPublishedTagStats() {
    return this.blogService.getPublishedTagStats();
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
  @UseGuards(OriginGuard, OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Поставить/снять лайк посту' })
  toggleLike(
    @Param('postId') postId: string,
    @Body() dto: ToggleLikeDto,
    @Req() req?: RequestWithUser,
  ) {
    const userId = req?.user?.id;
    return this.blogService.toggleLike(postId, userId, dto.guestId);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Получить категории блога (публичный)' })
  getCategories() {
    return this.blogService.getPublicCategories();
  }
}
