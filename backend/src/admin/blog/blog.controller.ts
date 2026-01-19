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
import { BlogService } from './blog.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestWithUser } from '../../common/types/request-with-user.types';

@Controller('admin/blog')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  // Posts
  @Post('posts')
  createPost(@Body() createBlogPostDto: CreateBlogPostDto, @Request() req: RequestWithUser) {
    return this.blogService.createPost(req.user.id, createBlogPostDto);
  }

  @Get('posts')
  findAllPosts(
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('authorId') authorId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.blogService.findAllPosts({
      status,
      categoryId,
      authorId,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('posts/:id')
  findOnePost(@Param('id') id: string) {
    return this.blogService.findOnePost(id);
  }

  @Patch('posts/:id')
  updatePost(@Param('id') id: string, @Body() updateBlogPostDto: UpdateBlogPostDto) {
    return this.blogService.updatePost(id, updateBlogPostDto);
  }

  @Patch('posts/:id/publish')
  publishPost(@Param('id') id: string) {
    return this.blogService.publishPost(id);
  }

  @Delete('posts/:id')
  removePost(@Param('id') id: string) {
    return this.blogService.removePost(id);
  }

  // Categories
  @Post('categories')
  createCategory(@Body() createBlogCategoryDto: CreateBlogCategoryDto) {
    return this.blogService.createCategory(createBlogCategoryDto);
  }

  @Get('categories')
  findAllCategories() {
    return this.blogService.findAllCategories();
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() data: Partial<CreateBlogCategoryDto>) {
    return this.blogService.updateCategory(id, data);
  }

  @Delete('categories/:id')
  removeCategory(@Param('id') id: string) {
    return this.blogService.removeCategory(id);
  }

  // Comments
  @Get('comments')
  findAllComments(
    @Query('status') status?: string,
    @Query('postId') postId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.blogService.findAllComments({
      status,
      postId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Patch('comments/:id/approve')
  approveComment(@Param('id') id: string) {
    return this.blogService.approveComment(id);
  }

  @Patch('comments/:id/reject')
  rejectComment(@Param('id') id: string) {
    return this.blogService.rejectComment(id);
  }

  @Patch('comments/:id/spam')
  markCommentAsSpam(@Param('id') id: string) {
    return this.blogService.markCommentAsSpam(id);
  }

  @Delete('comments/:id')
  removeComment(@Param('id') id: string) {
    return this.blogService.removeComment(id);
  }

  // Stats
  @Get('stats')
  getStats() {
    return this.blogService.getStats();
  }
}
