import { Injectable } from '@nestjs/common';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { computeReadingTimeMinutes } from './blog-post-blocks.util';
import { BlogPostsAdminService } from './blog-posts-admin.service';
import { BlogCategoriesService } from './blog-categories.service';
import { BlogPublicService } from './blog-public.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class BlogService {
  constructor(
    private prisma: PrismaService,
    private postsAdmin: BlogPostsAdminService,
    private categories: BlogCategoriesService,
    private blogPublic: BlogPublicService,
  ) {}

  computeReadingTimeMinutes(content: string) {
    return computeReadingTimeMinutes(content);
  }

  createPost(authorId: string, createBlogPostDto: CreateBlogPostDto) {
    return this.postsAdmin.createPost(authorId, createBlogPostDto);
  }

  findAllPosts(params?: Parameters<BlogPostsAdminService['findAllPosts']>[0]) {
    return this.postsAdmin.findAllPosts(params);
  }

  findOnePost(id: string) {
    return this.postsAdmin.findOnePost(id);
  }

  updatePost(id: string, updateBlogPostDto: UpdateBlogPostDto) {
    return this.postsAdmin.updatePost(id, updateBlogPostDto);
  }

  removePost(id: string) {
    return this.postsAdmin.removePost(id);
  }

  publishPost(id: string) {
    return this.postsAdmin.publishPost(id);
  }

  createCategory(createBlogCategoryDto: CreateBlogCategoryDto) {
    return this.categories.createCategory(createBlogCategoryDto);
  }

  findAllCategories() {
    return this.categories.findAllCategories();
  }

  updateCategory(id: string, data: Partial<CreateBlogCategoryDto>) {
    return this.categories.updateCategory(id, data);
  }

  removeCategory(id: string) {
    return this.categories.removeCategory(id);
  }

  findAllBadgePresets() {
    return this.categories.findAllBadgePresets();
  }

  createBadgePreset(label: string) {
    return this.categories.createBadgePreset(label);
  }

  uploadFeaturedImage(file: Express.Multer.File, baseUrl: string) {
    return this.postsAdmin.uploadFeaturedImage(file, baseUrl);
  }

  getPublishedTagStats() {
    return this.blogPublic.getPublishedTagStats();
  }

  getPublishedPosts(params?: Parameters<BlogPublicService['getPublishedPosts']>[0]) {
    return this.blogPublic.getPublishedPosts(params);
  }

  getPublishedPostBySlug(slug: string, likerId?: string) {
    return this.blogPublic.getPublishedPostBySlug(slug, likerId);
  }

  toggleLike(postId: string, userId?: string, guestId?: string) {
    return this.blogPublic.toggleLike(postId, userId, guestId);
  }

  getPublicCategories() {
    return this.categories.getPublicCategories();
  }

  async getStats() {
    const [totalPosts, publishedPosts, draftPosts] = await Promise.all([
      this.prisma.blogPost.count(),
      this.prisma.blogPost.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.blogPost.count({ where: { status: 'DRAFT' } }),
    ]);

    return {
      totalPosts,
      publishedPosts,
      draftPosts,
      pendingComments: 0,
    };
  }
}
