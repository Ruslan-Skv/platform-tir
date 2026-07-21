import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContractDocumentPackageKind, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { contractDocumentPackageInclude } from '../contract-document-packages/contract-package.include';
import {
  isMeaningfulContractDocumentObjectAddress,
  normalizeContractDocumentObjectAddress,
} from './contract-document-object-address';
import {
  packageFormCustomerName,
  packageFormNormalizedAddress,
  packageFormObjectAddress,
} from './contract-document-package-form-address';
import { AttachContractDocumentObjectMembersDto } from './dto/attach-contract-document-object-members.dto';
import { CreateContractDocumentObjectDto } from './dto/create-contract-document-object.dto';
import { UpdateContractDocumentObjectDto } from './dto/update-contract-document-object.dto';

const KIND_LABELS: Record<ContractDocumentPackageKind, string> = {
  REPAIR: 'Ремонт',
  WINDOWS: 'Окна',
  DOORS: 'Двери',
  CEILINGS: 'Натяжные потолки',
  BLINDS: 'Жалюзи',
  FURNITURE: 'Мебель',
};

function contractNumberFromFormData(formData: unknown): string {
  if (!formData || typeof formData !== 'object') return '—';
  const c = (formData as Record<string, unknown>).contract;
  if (!c || typeof c !== 'object') return '—';
  const num = String((c as Record<string, unknown>).number ?? '').trim();
  return num || '—';
}

@Injectable()
export class ContractDocumentObjectsService {
  constructor(private readonly prisma: PrismaService) {}

  private objectInclude() {
    return {
      packages: {
        where: { deletedAt: null },
        orderBy: [{ kind: 'asc' as const }, { createdAt: 'asc' as const }],
        include: contractDocumentPackageInclude,
      },
    };
  }

  private serializePackageSummary(pkg: {
    id: string;
    kind: ContractDocumentPackageKind;
    formData: unknown;
    documentObjectId: string | null;
  }) {
    const fd = pkg.formData;
    return {
      id: pkg.id,
      kind: pkg.kind,
      kindLabel: KIND_LABELS[pkg.kind],
      contractNumber: contractNumberFromFormData(fd),
      customerName: packageFormCustomerName(fd) || '—',
      objectAddress: packageFormObjectAddress(fd) || '—',
      normalizedAddress: packageFormNormalizedAddress(fd),
      documentObjectId: pkg.documentObjectId,
    };
  }

  private serializeObject(row: {
    id: string;
    name: string;
    customerName: string | null;
    address: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    packages?: Array<{
      id: string;
      kind: ContractDocumentPackageKind;
      formData: unknown;
      documentObjectId: string | null;
      payments?: Array<{ amount: Prisma.Decimal }>;
    }>;
  }) {
    const packages = (row.packages ?? []).map((p) => this.serializePackageSummary(p));
    return {
      id: row.id,
      name: row.name,
      customerName: row.customerName,
      address: row.address,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      packageCount: packages.length,
      packages,
    };
  }

  findAll() {
    return this.prisma.contractDocumentObject
      .findMany({
        orderBy: { updatedAt: 'desc' },
        include: this.objectInclude(),
      })
      .then((rows) => rows.map((r) => this.serializeObject(r)));
  }

  async findOne(id: string) {
    const row = await this.prisma.contractDocumentObject.findUnique({
      where: { id },
      include: this.objectInclude(),
    });
    if (!row) {
      throw new NotFoundException(`Объект договоров ${id} не найден`);
    }
    return this.serializeObject(row);
  }

  private async assertPackagesAttachable(packageIds: string[], objectId?: string) {
    const unique = [...new Set(packageIds.filter(Boolean))];
    if (unique.length === 0) {
      throw new BadRequestException('Укажите хотя бы один договор');
    }

    const packages = await this.prisma.contractDocumentPackage.findMany({
      where: { id: { in: unique }, deletedAt: null },
      select: { id: true, documentObjectId: true },
    });

    if (packages.length !== unique.length) {
      throw new BadRequestException('Один или несколько договоров не найдены или в корзине');
    }

    for (const p of packages) {
      if (p.documentObjectId && p.documentObjectId !== objectId) {
        throw new BadRequestException(
          'Один из договоров уже входит в другой объект. Сначала исключите его из того объекта.',
        );
      }
    }

    return unique;
  }

  async create(dto: CreateContractDocumentObjectDto) {
    const name = dto.name?.trim();
    if (!name) {
      throw new BadRequestException('Укажите название объекта');
    }

    const packageIds = dto.packageIds?.length
      ? await this.assertPackagesAttachable(dto.packageIds)
      : [];

    const created = await this.prisma.$transaction(async (tx) => {
      const obj = await tx.contractDocumentObject.create({
        data: {
          name,
          customerName: dto.customerName?.trim() || null,
          address: dto.address?.trim() || null,
          notes: dto.notes?.trim() || null,
        },
      });

      if (packageIds.length > 0) {
        await tx.contractDocumentPackage.updateMany({
          where: { id: { in: packageIds } },
          data: { documentObjectId: obj.id },
        });
      }

      return tx.contractDocumentObject.findUniqueOrThrow({
        where: { id: obj.id },
        include: this.objectInclude(),
      });
    });

    return this.serializeObject(created);
  }

  async update(id: string, dto: UpdateContractDocumentObjectDto) {
    await this.findOne(id);
    const data: Prisma.ContractDocumentObjectUpdateInput = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Название не может быть пустым');
      data.name = name;
    }
    if (dto.customerName !== undefined) data.customerName = dto.customerName.trim() || null;
    if (dto.address !== undefined) data.address = dto.address.trim() || null;
    if (dto.notes !== undefined) data.notes = dto.notes.trim() || null;

    const updated = await this.prisma.contractDocumentObject.update({
      where: { id },
      data,
      include: this.objectInclude(),
    });
    return this.serializeObject(updated);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.$transaction([
      this.prisma.contractDocumentPackage.updateMany({
        where: { documentObjectId: id },
        data: { documentObjectId: null },
      }),
      this.prisma.contractDocumentObject.delete({ where: { id } }),
    ]);
    return { ok: true };
  }

  async attachMembers(id: string, dto: AttachContractDocumentObjectMembersDto) {
    await this.findOne(id);
    const packageIds = await this.assertPackagesAttachable(dto.packageIds, id);
    await this.prisma.contractDocumentPackage.updateMany({
      where: { id: { in: packageIds } },
      data: { documentObjectId: id },
    });
    return this.findOne(id);
  }

  async detachMember(objectId: string, packageId: string) {
    await this.findOne(objectId);
    const pkg = await this.prisma.contractDocumentPackage.findFirst({
      where: { id: packageId, documentObjectId: objectId, deletedAt: null },
      select: { id: true },
    });
    if (!pkg) {
      throw new NotFoundException('Договор не найден в этом объекте');
    }
    await this.prisma.contractDocumentPackage.update({
      where: { id: packageId },
      data: { documentObjectId: null },
    });
    return this.findOne(objectId);
  }

  private buildAutoObjectName(sampleFormData: unknown, normalizedAddress: string): string {
    const addr = packageFormObjectAddress(sampleFormData);
    if (addr) {
      return addr.length > 120 ? `${addr.slice(0, 117)}…` : addr;
    }
    const customer = packageFormCustomerName(sampleFormData);
    if (customer) return `Объект: ${customer}`;
    return `Объект (${normalizedAddress.slice(0, 48)})`;
  }

  /**
   * Автоматически группирует договоры в объекты по совпадающему адресу объекта в formData.
   * Один нормализованный адрес — один объект; договоры без объекта прикрепляются к нему.
   */
  async autoSyncByAddress() {
    const stats = { createdObjects: 0, mergedObjects: 0, attachedPackages: 0 };

    const [packages, objectRows] = await Promise.all([
      this.prisma.contractDocumentPackage.findMany({
        where: { deletedAt: null },
        select: { id: true, formData: true, documentObjectId: true },
      }),
      this.prisma.contractDocumentObject.findMany({
        include: {
          packages: {
            where: { deletedAt: null },
            select: { id: true, formData: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const byNorm = new Map<string, typeof packages>();
    for (const pkg of packages) {
      const raw = packageFormObjectAddress(pkg.formData);
      if (!isMeaningfulContractDocumentObjectAddress(raw)) continue;
      const norm = packageFormNormalizedAddress(pkg.formData);
      const list = byNorm.get(norm) ?? [];
      list.push(pkg);
      byNorm.set(norm, list);
    }

    for (const [norm, group] of byNorm) {
      const relatedObjectIds = new Set<string>();
      for (const pkg of group) {
        if (pkg.documentObjectId) relatedObjectIds.add(pkg.documentObjectId);
      }
      for (const obj of objectRows) {
        if (normalizeContractDocumentObjectAddress(obj.address ?? '') === norm) {
          relatedObjectIds.add(obj.id);
        }
        for (const member of obj.packages) {
          if (packageFormNormalizedAddress(member.formData) === norm) {
            relatedObjectIds.add(obj.id);
          }
        }
      }

      let targetId: string | null = null;

      if (relatedObjectIds.size > 1) {
        const candidates = objectRows
          .filter((o) => relatedObjectIds.has(o.id))
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        targetId = candidates[0]?.id ?? null;
        for (let i = 1; i < candidates.length; i++) {
          const loserId = candidates[i].id;
          await this.prisma.contractDocumentPackage.updateMany({
            where: { documentObjectId: loserId },
            data: { documentObjectId: targetId! },
          });
          await this.prisma.contractDocumentObject.delete({ where: { id: loserId } });
          const idx = objectRows.findIndex((o) => o.id === loserId);
          if (idx >= 0) objectRows.splice(idx, 1);
          stats.mergedObjects += 1;
        }
      } else if (relatedObjectIds.size === 1) {
        targetId = [...relatedObjectIds][0];
      }

      if (!targetId) {
        if (group.length < 2) continue;
        const sample = group[0].formData;
        const created = await this.prisma.contractDocumentObject.create({
          data: {
            name: this.buildAutoObjectName(sample, norm),
            customerName: packageFormCustomerName(sample) || null,
            address: packageFormObjectAddress(sample) || null,
          },
        });
        objectRows.push({
          ...created,
          packages: [],
        });
        targetId = created.id;
        stats.createdObjects += 1;
      }

      const packageIdsToAttach = group
        .filter((pkg) => pkg.documentObjectId !== targetId)
        .map((pkg) => pkg.id);

      if (packageIdsToAttach.length > 0) {
        await this.prisma.contractDocumentPackage.updateMany({
          where: { id: { in: packageIdsToAttach } },
          data: { documentObjectId: targetId },
        });
        stats.attachedPackages += packageIdsToAttach.length;
        for (const pkg of packages) {
          if (packageIdsToAttach.includes(pkg.id)) {
            pkg.documentObjectId = targetId;
          }
        }
      }

      const targetObj = objectRows.find((o) => o.id === targetId);
      if (targetObj && !targetObj.address?.trim()) {
        const addr = packageFormObjectAddress(group[0].formData);
        if (addr) {
          await this.prisma.contractDocumentObject.update({
            where: { id: targetId },
            data: { address: addr },
          });
          targetObj.address = addr;
        }
      }
    }

    return stats;
  }

  /**
   * Автопредложение: договоры без объекта с тем же адресом + существующие объекты по адресу.
   */
  async suggestMerge(address: string, excludeObjectId?: string) {
    const normalized = normalizeContractDocumentObjectAddress(address);
    if (!isMeaningfulContractDocumentObjectAddress(address)) {
      return {
        normalizedAddress: normalized,
        matchingPackages: [],
        existingObjects: [],
      };
    }

    const activePackages = await this.prisma.contractDocumentPackage.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        kind: true,
        formData: true,
        documentObjectId: true,
      },
    });

    const matchingPackages = activePackages
      .filter((p) => !p.documentObjectId && packageFormNormalizedAddress(p.formData) === normalized)
      .map((p) => this.serializePackageSummary(p));

    const objects = await this.prisma.contractDocumentObject.findMany({
      where: excludeObjectId ? { NOT: { id: excludeObjectId } } : undefined,
      include: {
        packages: {
          where: { deletedAt: null },
          select: { id: true, kind: true, formData: true, documentObjectId: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    const existingObjects = objects
      .filter((obj) => {
        const objNorm = normalizeContractDocumentObjectAddress(obj.address ?? '');
        if (objNorm && objNorm === normalized) return true;
        return obj.packages.some((p) => packageFormNormalizedAddress(p.formData) === normalized);
      })
      .map((obj) => ({
        id: obj.id,
        name: obj.name,
        customerName: obj.customerName,
        address: obj.address,
        packageCount: obj.packages.length,
        packages: obj.packages.map((p) => this.serializePackageSummary(p)),
      }));

    return {
      normalizedAddress: normalized,
      matchingPackages,
      existingObjects,
    };
  }
}
