import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async create(createSupplierDto: CreateSupplierDto) {
    const existing = await this.prisma.supplier.findUnique({
      where: { code: createSupplierDto.code },
    });

    if (existing) {
      throw new ConflictException(`Supplier with code "${createSupplierDto.code}" already exists`);
    }

    return this.prisma.supplier.create({
      data: {
        ...createSupplierDto,
        priceMarkup: createSupplierDto.priceMarkup
          ? new Prisma.Decimal(createSupplierDto.priceMarkup)
          : new Prisma.Decimal(0),
      },
    });
  }

  async findAll(params?: {
    search?: string;
    isActive?: boolean;
    syncEnabled?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { search, isActive, syncEnabled, page = 1, limit = 20 } = params || {};
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (syncEnabled !== undefined) {
      where.syncEnabled = syncEnabled;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        include: {
          _count: {
            select: {
              products: true,
              syncLogs: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      data: suppliers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
        syncLogs: {
          take: 10,
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return supplier;
  }

  async update(id: string, data: Partial<CreateSupplierDto>) {
    const supplier = await this.findOne(id);

    if (data.code && data.code !== supplier.code) {
      const existing = await this.prisma.supplier.findUnique({
        where: { code: data.code },
      });

      if (existing) {
        throw new ConflictException(`Supplier with code "${data.code}" already exists`);
      }
    }

    const updateData: Prisma.SupplierUpdateInput = {
      name: data.name,
      code: data.code,
      website: data.website,
      apiUrl: data.apiUrl,
      apiKey: data.apiKey,
      isActive: data.isActive,
      syncEnabled: data.syncEnabled,
      syncSchedule: data.syncSchedule,
      email: data.email,
      phone: data.phone,
    };
    if (data.priceMarkup !== undefined) {
      updateData.priceMarkup = new Prisma.Decimal(data.priceMarkup);
    }

    return this.prisma.supplier.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.supplier.delete({
      where: { id },
    });
  }

  // Sync functionality
  async startSync(id: string) {
    const supplier = await this.findOne(id);

    if (!supplier.isActive || !supplier.syncEnabled) {
      throw new ConflictException('Supplier sync is disabled');
    }

    // Create sync log entry
    const syncLog = await this.prisma.supplierSyncLog.create({
      data: {
        supplierId: id,
        status: 'RUNNING',
      },
    });

    // In a real implementation, this would be a background job
    // For now, we'll just simulate the sync process
    try {
      // Simulate sync - in production, this would fetch from supplier API
      const result = await this.performSync(supplier);

      await this.prisma.supplierSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          productsAdded: result.added,
          productsUpdated: result.updated,
          productsRemoved: result.removed,
        },
      });

      await this.prisma.supplier.update({
        where: { id },
        data: { lastSyncAt: new Date() },
      });

      return { success: true, ...result };
    } catch (error) {
      await this.prisma.supplierSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errors: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async performSync(supplier: unknown) {
    // This is a placeholder for actual sync logic
    // In a real implementation, you would:
    // 1. Fetch products from supplier API
    // 2. Compare with existing products
    // 3. Add new products, update existing ones, mark removed ones

    // Simulated result
    return {
      added: 0,
      updated: 0,
      removed: 0,
    };
  }

  async getSyncLogs(supplierId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.supplierSyncLog.findMany({
        where: { supplierId },
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.supplierSyncLog.count({ where: { supplierId } }),
    ]);

    return {
      data: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Product mapping
  async getSupplierProducts(supplierId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prisma.productSupplier.findMany({
        where: { supplierId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              price: true,
              stock: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.productSupplier.count({ where: { supplierId } }),
    ]);

    return {
      data: products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async mapProduct(
    supplierId: string,
    productId: string,
    data: {
      supplierSku: string;
      supplierPrice: number;
      supplierStock?: number;
      isMainSupplier?: boolean;
    },
  ) {
    return this.prisma.productSupplier.upsert({
      where: {
        productId_supplierId: {
          productId,
          supplierId,
        },
      },
      update: {
        supplierSku: data.supplierSku,
        supplierPrice: new Prisma.Decimal(data.supplierPrice),
        supplierStock: data.supplierStock ?? 0,
        isMainSupplier: data.isMainSupplier ?? false,
        lastSyncAt: new Date(),
      },
      create: {
        productId,
        supplierId,
        supplierSku: data.supplierSku,
        supplierPrice: new Prisma.Decimal(data.supplierPrice),
        supplierStock: data.supplierStock ?? 0,
        isMainSupplier: data.isMainSupplier ?? false,
      },
    });
  }

  async unmapProduct(supplierId: string, productId: string) {
    return this.prisma.productSupplier.delete({
      where: {
        productId_supplierId: {
          productId,
          supplierId,
        },
      },
    });
  }
}
