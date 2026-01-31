import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { extname } from 'path';
import { PrismaService } from '../../database/prisma.service';
import { CreatePhotoCategoryDto } from './dto/create-photo-category.dto';
import { CreatePhotoProjectDto } from './dto/create-photo-project.dto';
import { UpdatePhotoProjectDto } from './dto/update-photo-project.dto';
import { CreatePhotoDto } from './dto/create-photo.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PhotoService {
  constructor(private prisma: PrismaService) {}

  // Categories
  async createCategory(dto: CreatePhotoCategoryDto) {
    const existing = await this.prisma.photoCategory.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Категория с slug "${dto.slug}" уже существует`);
    }
    return this.prisma.photoCategory.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        image: dto.image,
        order: dto.order ?? 0,
      },
    });
  }

  async findAllCategories() {
    return this.prisma.photoCategory.findMany({
      include: {
        _count: { select: { projects: true } },
      },
      orderBy: { order: 'asc' },
    });
  }

  async findCategoryBySlug(slug: string) {
    const cat = await this.prisma.photoCategory.findUnique({
      where: { slug },
      include: { _count: { select: { projects: true } } },
    });
    if (!cat) {
      throw new NotFoundException(`Категория "${slug}" не найдена`);
    }
    return cat;
  }

  async updateCategory(id: string, data: Partial<CreatePhotoCategoryDto>) {
    await this.findCategoryById(id);
    if (data.slug) {
      const existing = await this.prisma.photoCategory.findFirst({
        where: { slug: data.slug, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Категория с slug "${data.slug}" уже существует`);
      }
    }
    return this.prisma.photoCategory.update({
      where: { id },
      data,
    });
  }

  async removeCategory(id: string) {
    await this.findCategoryById(id);
    return this.prisma.photoCategory.delete({
      where: { id },
    });
  }

  async findOneCategory(id: string) {
    const cat = await this.prisma.photoCategory.findUnique({
      where: { id },
      include: { _count: { select: { projects: true } } },
    });
    if (!cat) {
      throw new NotFoundException(`Категория не найдена`);
    }
    return cat;
  }

  private async findCategoryById(id: string) {
    const cat = await this.prisma.photoCategory.findUnique({
      where: { id },
    });
    if (!cat) {
      throw new NotFoundException(`Категория не найдена`);
    }
    return cat;
  }

  // Projects
  async createProject(dto: CreatePhotoProjectDto) {
    await this.findCategoryById(dto.categoryId);
    return this.prisma.photoProject.create({
      data: {
        categoryId: dto.categoryId,
        title: dto.title,
        description: dto.description,
        displayMode: dto.displayMode ?? 'grid',
        sortOrder: dto.sortOrder ?? 0,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        photos: true,
      },
    });
  }

  async findAllProjects(params?: {
    categoryId?: string;
    categorySlug?: string;
    page?: number;
    limit?: number;
  }) {
    const { categoryId, categorySlug, page = 1, limit = 20 } = params ?? {};
    const skip = (page - 1) * limit;

    const where: Prisma.PhotoProjectWhereInput = {};
    if (categoryId) where.categoryId = categoryId;
    if (categorySlug) where.category = { slug: categorySlug };

    const [projects, total] = await Promise.all([
      this.prisma.photoProject.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          photos: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.photoProject.count({ where }),
    ]);

    return {
      data: projects,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneProject(id: string) {
    const project = await this.prisma.photoProject.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        photos: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!project) {
      throw new NotFoundException('Проект не найден');
    }
    return project;
  }

  async updateProject(id: string, dto: UpdatePhotoProjectDto) {
    await this.findOneProject(id);
    if (dto.categoryId) {
      await this.findCategoryById(dto.categoryId);
    }
    return this.prisma.photoProject.update({
      where: { id },
      data: dto,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        photos: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async removeProject(id: string) {
    await this.findOneProject(id);
    return this.prisma.photoProject.delete({
      where: { id },
    });
  }

  // Photos
  async createPhoto(dto: CreatePhotoDto) {
    await this.findOneProject(dto.projectId);
    return this.prisma.photo.create({
      data: {
        projectId: dto.projectId,
        imageUrl: dto.imageUrl,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: {
        project: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
  }

  async createPhotos(projectId: string, imageUrls: string[]) {
    await this.findOneProject(projectId);
    const count = await this.prisma.photo.count({ where: { projectId } });
    const photos = await this.prisma.$transaction(
      imageUrls.map((imageUrl, i) =>
        this.prisma.photo.create({
          data: {
            projectId,
            imageUrl,
            sortOrder: count + i,
          },
        }),
      ),
    );
    return photos;
  }

  async findAllPhotos(params?: { projectId?: string; page?: number; limit?: number }) {
    const { projectId, page = 1, limit = 50 } = params ?? {};
    const skip = (page - 1) * limit;

    const where: Prisma.PhotoWhereInput = {};
    if (projectId) where.projectId = projectId;

    const [photos, total] = await Promise.all([
      this.prisma.photo.findMany({
        where,
        include: {
          project: {
            include: {
              category: { select: { id: true, name: true, slug: true } },
            },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.photo.count({ where }),
    ]);

    return {
      data: photos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOnePhoto(id: string) {
    const photo = await this.prisma.photo.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
    if (!photo) {
      throw new NotFoundException('Фото не найдено');
    }
    return photo;
  }

  async updatePhoto(id: string, dto: UpdatePhotoDto) {
    await this.findOnePhoto(id);
    if (dto.projectId) {
      await this.findOneProject(dto.projectId);
    }
    return this.prisma.photo.update({
      where: { id },
      data: dto,
      include: {
        project: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
  }

  async removePhoto(id: string) {
    await this.findOnePhoto(id);
    return this.prisma.photo.delete({
      where: { id },
    });
  }

  // Public
  async getPublicCategories() {
    return this.prisma.photoCategory.findMany({
      include: {
        _count: { select: { projects: true } },
      },
      orderBy: { order: 'asc' },
    });
  }

  async getPublicProjects(categorySlug?: string, page = 1, limit = 12) {
    return this.findAllProjects({
      categorySlug,
      page,
      limit,
    });
  }

  async uploadImage(file: Express.Multer.File, baseUrl: string): Promise<{ imageUrl: string }> {
    if (!file?.path) {
      throw new ConflictException('Файл не загружен');
    }
    const uploadsDir = path.join(process.cwd(), 'uploads', 'photo');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const ext = extname(file.originalname) || '.jpg';
    const filename = `photo-${Date.now()}${ext}`;
    const destPath = path.join(uploadsDir, filename);
    fs.renameSync(file.path, destPath);
    const imageUrl = `/uploads/photo/${filename}`;
    const prefix = baseUrl.replace(/\/$/, '');
    return { imageUrl: `${prefix}${imageUrl}` };
  }
}
