import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

@Injectable()
export class CategoriesCrudService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto, createdByUserId?: string) {
    const category = await this.prisma.category.create({
      data: {
        name: createCategoryDto.name,
        slug: createCategoryDto.slug,
        description: createCategoryDto.description,
        image: createCategoryDto.image,
        icon: createCategoryDto.icon,
        parentId: createCategoryDto.parentId ?? undefined,
        order: createCategoryDto.order ?? 0,
        isActive: createCategoryDto.isActive ?? true,
        createdById: createdByUserId ?? null,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    if (createCategoryDto.parentId) {
      await this.inheritAttributesFromParent(category.id, createCategoryDto.parentId);
    }

    return category;
  }

  async inheritAttributesFromParent(categoryId: string, parentId: string) {
    const parentAttributes = await this.prisma.categoryAttribute.findMany({
      where: { categoryId: parentId },
      orderBy: { order: 'asc' },
    });

    if (parentAttributes.length === 0) {
      return { inherited: 0, skipped: 0 };
    }

    const existingAttributes = await this.prisma.categoryAttribute.findMany({
      where: { categoryId },
      select: { attributeId: true },
    });
    const existingAttributeIds = new Set(existingAttributes.map((a) => a.attributeId));

    const attributesToAdd = parentAttributes.filter(
      (attr) => !existingAttributeIds.has(attr.attributeId),
    );

    if (attributesToAdd.length === 0) {
      return { inherited: 0, skipped: parentAttributes.length };
    }

    await this.prisma.categoryAttribute.createMany({
      data: attributesToAdd.map((attr) => ({
        categoryId,
        attributeId: attr.attributeId,
        isRequired: attr.isRequired,
        order: attr.order,
      })),
    });

    return {
      inherited: attributesToAdd.length,
      skipped: parentAttributes.length - attributesToAdd.length,
    };
  }

  async findAll(includeInactive = false) {
    const whereClause = includeInactive ? {} : { isActive: true };
    const childrenWhere = includeInactive ? {} : { isActive: true };

    const categories = await this.prisma.category.findMany({
      where: {
        ...whereClause,
        parentId: null,
      },
      include: {
        children: {
          where: childrenWhere,
          include: {
            children: {
              where: childrenWhere,
              include: {
                _count: {
                  select: { products: true },
                },
              },
            },
            _count: {
              select: { products: true },
            },
          },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: { order: 'asc' },
    });

    const calculateTotalProducts = (
      category: (typeof categories)[0],
    ): (typeof categories)[0] & { _count: { products: number; totalProducts: number } } => {
      let totalProducts = category._count.products;

      const processedChildren = category.children?.map((child) => {
        const processedChild = calculateTotalProducts(child as (typeof categories)[0]);
        totalProducts += processedChild._count.totalProducts;
        return processedChild;
      });

      return {
        ...category,
        children: processedChildren,
        _count: {
          products: category._count.products,
          totalProducts,
        },
      };
    };

    return categories.map(calculateTotalProducts);
  }

  async findAllFlat() {
    return this.prisma.category.findMany({
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: [{ parentId: 'asc' }, { order: 'asc' }, { name: 'asc' }],
    });
  }

  async getNavigationStructure() {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: { order: 'asc' },
    });

    const rootCategories = categories.filter((c) => !c.parentId);

    return rootCategories.map((root) => ({
      name: root.name,
      slug: root.slug,
      href: `/catalog/products/${root.slug}`,
      productCount: root._count.products,
      hasSubmenu: root.children.length > 0,
      submenu: root.children.map((child) => ({
        name: child.name,
        slug: child.slug,
        href: `/catalog/products/${root.slug}/${child.slug.replace(`${root.slug}-`, '')}`,
        productCount:
          (child as typeof child & { _count?: { products: number } })._count?.products || 0,
      })),
    }));
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        products: {
          where: { isActive: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        parent: true,
        children: true,
        products: {
          where: { isActive: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with slug ${slug} not found`);
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    await this.findOne(id);
    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.category.delete({
      where: { id },
    });
  }
}
