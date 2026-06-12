import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';

@Injectable()
export class BlogCategoriesService {
  constructor(private prisma: PrismaService) {}

  async createCategory(createBlogCategoryDto: CreateBlogCategoryDto) {
    const existing = await this.prisma.blogCategory.findUnique({
      where: { slug: createBlogCategoryDto.slug },
    });

    if (existing) {
      throw new ConflictException(
        `Category with slug "${createBlogCategoryDto.slug}" already exists`,
      );
    }

    return this.prisma.blogCategory.create({
      data: createBlogCategoryDto,
    });
  }

  async findAllCategories() {
    return this.prisma.blogCategory.findMany({
      include: {
        _count: {
          select: {
            posts: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async updateCategory(id: string, data: Partial<CreateBlogCategoryDto>) {
    return this.prisma.blogCategory.update({
      where: { id },
      data,
    });
  }

  async removeCategory(id: string) {
    return this.prisma.blogCategory.delete({
      where: { id },
    });
  }

  async findAllBadgePresets() {
    return this.prisma.blogBadgePreset.findMany({
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  async createBadgePreset(label: string) {
    const t = label.trim();
    if (!t) {
      throw new BadRequestException('Укажите текст плашки');
    }
    const existing = await this.prisma.blogBadgePreset.findUnique({
      where: { label: t },
    });
    if (existing) {
      throw new ConflictException('Такая плашка уже есть в списке');
    }
    return this.prisma.blogBadgePreset.create({
      data: { label: t },
    });
  }

  async getPublicCategories() {
    return this.prisma.blogCategory.findMany({
      include: {
        _count: {
          select: {
            posts: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    });
  }
}
