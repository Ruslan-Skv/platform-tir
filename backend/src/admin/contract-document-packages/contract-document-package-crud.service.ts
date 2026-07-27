import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContractDocumentPackageKind, ContractDocumentPackageStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { contractDocumentPackageInclude } from './contract-package.include';
import { CreateContractDocumentPackageDto } from './dto/create-contract-document-package.dto';
import { UpdateContractDocumentPackageDto } from './dto/update-contract-document-package.dto';
import { injectDefaultWorkPeriodIntoFormData } from './repair-contract-work-period';
import { buildPackageVersionKeyMoments } from './package-version-key-moments';
import { ContractDocumentPackageEstimatePresetsService } from './contract-document-package-estimate-presets.service';
import { ContractDocumentPackageKindSettingsService } from './contract-document-package-kind-settings.service';
import {
  type PackageListPipelineStatus,
  computePackageEffectiveManagerUserId,
  computePackageListPipelineStatus,
  packageMatchesDateRange,
  packageMatchesDirectionIds,
  packageMatchesListSearch as packageFormMatchesListSearch,
} from './list-pipeline/package-list-pipeline-status';

export type ContractDocumentPackageListSortBy =
  | 'date'
  | 'contractNumber'
  | 'status'
  | 'customer'
  | 'manager'
  | 'updatedAt';

export type ContractDocumentPackageFindAllFilters = {
  kind?: ContractDocumentPackageKind;
  kinds?: ContractDocumentPackageKind[];
  responsibleManagerId?: string;
  /** Грубый DB-статус пакета. */
  statuses?: ContractDocumentPackageStatus[];
  search?: string;
  /** Точные pipeline-статусы списка. */
  pipelineStatuses?: PackageListPipelineStatus[];
  /** Exact effective manager (responsible → signatory → createdBy). */
  managerId?: string;
  dateFrom?: string;
  dateTo?: string;
  directionIds?: string[];
  sortBy?: ContractDocumentPackageListSortBy;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  includeCounts?: boolean;
  /** Для counts.scope.mine при includeCounts. */
  countsUserId?: string;
  /** Для counts.scope.my_directions при includeCounts. */
  countsMyDirectionIds?: string[];
  /**
   * true → `{ data, total, page, limit, totalPages, counts? }`
   * false/undefined без page → legacy массив (обратная совместимость).
   */
  paginated?: boolean;
};

export type ContractDocumentPackageListCounts = {
  scope: { mine: number; my_directions: number; all: number };
  queue: Record<string, number>;
  directions: Record<string, number>;
};

const QUEUE_PRESET_STATUS_MAP: Record<string, PackageListPipelineStatus[]> = {
  all: [],
  in_project: ['IN_PROJECT'],
  to_production: ['SIGNED'],
  in_work: ['WORK_IN_PROGRESS'],
  production: ['SIGNED', 'WORK_IN_PROGRESS'],
  closed: ['CLOSED'],
  refused: ['REFUSED'],
};

const PIPELINE_STATUS_ORDER: Record<PackageListPipelineStatus, number> = {
  IN_PROJECT: 0,
  SIGNED: 1,
  WORK_IN_PROGRESS: 2,
  CLOSED: 3,
  REFUSED: 4,
};

@Injectable()
export class ContractDocumentPackageCrudService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly estimatePresets: ContractDocumentPackageEstimatePresetsService,
    private readonly kindSettings: ContractDocumentPackageKindSettingsService,
  ) {}

  async create(dto: CreateContractDocumentPackageDto, createdById?: string) {
    if (dto.crmContractId) {
      await this.assertCrmContractExists(dto.crmContractId);
    }
    const fromFormSignatory = this.extractSignatoryCrmUserId(dto.formData);
    const responsibleManagerId = await this.resolveResponsibleManagerId(
      dto.responsibleManagerId ?? fromFormSignatory,
      createdById,
    );
    let formDataInput: unknown = dto.formData ?? {};
    if (
      dto.kind === ContractDocumentPackageKind.REPAIR ||
      dto.kind === ContractDocumentPackageKind.WINDOWS ||
      dto.kind === ContractDocumentPackageKind.DOORS ||
      dto.kind === ContractDocumentPackageKind.BLINDS ||
      dto.kind === ContractDocumentPackageKind.CEILINGS
    ) {
      const defaultDays = await this.kindSettings.resolveDefaultWorkPeriodDays(dto.kind);
      formDataInput = injectDefaultWorkPeriodIntoFormData(formDataInput, defaultDays);
    }
    if (dto.kind === ContractDocumentPackageKind.REPAIR) {
      await this.assertRepairEstimatePresetsExclusive(null, formDataInput);
    } else if (dto.formData !== undefined) {
      await this.assertRepairEstimatePresetsExclusive(null, dto.formData);
    }
    const created = await this.prisma.contractDocumentPackage.create({
      data: {
        kind: dto.kind,
        title: dto.title ?? null,
        formData: formDataInput as Prisma.InputJsonValue,
        createdById: createdById ?? null,
        responsibleManagerId,
        crmContractId: dto.crmContractId ?? null,
      },
      include: contractDocumentPackageInclude,
    });
    await this.appendPackageVersion(
      created.id,
      {
        title: created.title,
        formData: created.formData as Prisma.InputJsonValue,
        crmContractId: created.crmContractId,
        status: created.status,
      },
      createdById ?? null,
    );
    return this.findOne(created.id);
  }

  async findAll(filters?: ContractDocumentPackageFindAllFilters) {
    const kinds = filters?.kinds?.length ? [...new Set(filters.kinds)] : [];
    const statuses = filters?.statuses?.length ? [...new Set(filters.statuses)] : [];
    const searchNorm = filters?.search?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
    const pipelineStatuses = filters?.pipelineStatuses?.length
      ? [...new Set(filters.pipelineStatuses)]
      : [];
    const managerId = filters?.managerId?.trim() || '';
    const dateFrom = filters?.dateFrom?.trim() || '';
    const dateTo = filters?.dateTo?.trim() || '';
    const directionIds = filters?.directionIds?.length
      ? [...new Set(filters.directionIds.filter(Boolean))]
      : [];
    const sortBy = filters?.sortBy ?? 'updatedAt';
    const sortOrder = filters?.sortOrder === 'asc' ? 'asc' : 'desc';
    const paginated = Boolean(filters?.paginated || filters?.page != null);
    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(Math.max(filters?.limit ?? 20, 1), 200);
    const includeCounts = Boolean(filters?.includeCounts);
    const countsUserId = filters?.countsUserId?.trim() || '';
    const countsMyDirectionIds = filters?.countsMyDirectionIds?.length
      ? [...new Set(filters.countsMyDirectionIds.filter(Boolean))]
      : [];

    const directionIdBySlug = new Map<string, string>();
    if (directionIds.length > 0 || includeCounts || countsMyDirectionIds.length > 0) {
      const dirs = await this.prisma.crmDirection.findMany({
        select: { id: true, slug: true },
      });
      for (const d of dirs) {
        if (d.slug) directionIdBySlug.set(d.slug, d.id);
      }
    }

    const rows = await this.prisma.contractDocumentPackage.findMany({
      where: {
        deletedAt: null,
        ...(filters?.kind ? { kind: filters.kind } : {}),
        ...(kinds.length > 0 ? { kind: { in: kinds } } : {}),
        ...(filters?.responsibleManagerId
          ? { responsibleManagerId: filters.responsibleManagerId }
          : {}),
        ...(statuses.length > 0 ? { status: { in: statuses } } : {}),
        ...(searchNorm
          ? {
              OR: [
                { title: { contains: filters!.search!.trim(), mode: 'insensitive' } },
                {
                  documentObject: {
                    is: {
                      OR: [
                        {
                          name: {
                            contains: filters!.search!.trim(),
                            mode: 'insensitive',
                          },
                        },
                        {
                          customerName: {
                            contains: filters!.search!.trim(),
                            mode: 'insensitive',
                          },
                        },
                        {
                          address: {
                            contains: filters!.search!.trim(),
                            mode: 'insensitive',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        ...contractDocumentPackageInclude,
        _count: { select: { versions: true } },
      },
    });

    type Row = (typeof rows)[number];
    const annotate = (pkg: Row) => {
      const payments = (pkg.payments ?? []).map((p) => ({
        amount:
          typeof p.amount === 'object' && p.amount != null
            ? String(p.amount)
            : (p.amount as string | number),
        paymentType: p.paymentType,
        addendumNumber: p.addendumNumber,
        paymentDate: p.paymentDate,
      }));
      const pipelineStatus = computePackageListPipelineStatus({
        kind: pkg.kind,
        status: pkg.status,
        formData: pkg.formData,
        payments,
      });
      const effectiveManagerId = computePackageEffectiveManagerUserId({
        responsibleManagerId: pkg.responsibleManagerId,
        createdById: pkg.createdById,
        formData: pkg.formData,
      });
      return { pkg, pipelineStatus, effectiveManagerId };
    };

    const annotated = rows.map(annotate);

    const matchesExact = (
      item: ReturnType<typeof annotate>,
      opts: {
        searchNorm: string;
        managerId: string;
        pipelineStatuses: PackageListPipelineStatus[];
        directionIds: string[];
        dateFrom: string;
        dateTo: string;
      },
    ) => {
      const { pkg, pipelineStatus, effectiveManagerId } = item;
      if (opts.searchNorm) {
        const ok = packageFormMatchesListSearch(pkg.formData, opts.searchNorm, {
          title: pkg.title,
          objectName: pkg.documentObject?.name ?? null,
          objectAddress: pkg.documentObject?.address ?? null,
        });
        if (!ok && !this.packageMatchesListSearch(pkg, opts.searchNorm)) return false;
      }
      if (opts.managerId && effectiveManagerId !== opts.managerId) return false;
      if (opts.pipelineStatuses.length > 0 && !opts.pipelineStatuses.includes(pipelineStatus)) {
        return false;
      }
      if (
        opts.directionIds.length > 0 &&
        !packageMatchesDirectionIds(pkg.kind, opts.directionIds, directionIdBySlug)
      ) {
        return false;
      }
      if (
        (opts.dateFrom || opts.dateTo) &&
        !packageMatchesDateRange(pkg.formData, opts.dateFrom, opts.dateTo)
      ) {
        return false;
      }
      return true;
    };

    const baseOpts = {
      searchNorm,
      managerId,
      pipelineStatuses,
      directionIds,
      dateFrom,
      dateTo,
    };

    let filtered = annotated.filter((item) => matchesExact(item, baseOpts));

    filtered = this.sortAnnotatedPackages(filtered, sortBy, sortOrder);

    const counts: ContractDocumentPackageListCounts | undefined = includeCounts
      ? this.buildListCounts(
          annotated,
          matchesExact,
          {
            searchNorm,
            managerId,
            pipelineStatuses,
            directionIds,
            dateFrom,
            dateTo,
          },
          directionIdBySlug,
          countsUserId,
          countsMyDirectionIds,
        )
      : undefined;

    if (!paginated) {
      return filtered.map((x) => x.pkg);
    }

    const total = filtered.length;
    const skip = (page - 1) * limit;
    const data = filtered.slice(skip, skip + limit).map((x) => x.pkg);
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      ...(counts ? { counts } : {}),
    };
  }

  private buildListCounts(
    annotated: Array<{
      pkg: {
        kind: ContractDocumentPackageKind;
        responsibleManagerId: string | null;
        createdById: string | null;
        formData: unknown;
      };
      pipelineStatus: PackageListPipelineStatus;
      effectiveManagerId: string;
    }>,
    matchesExact: (
      item: (typeof annotated)[number],
      opts: {
        searchNorm: string;
        managerId: string;
        pipelineStatuses: PackageListPipelineStatus[];
        directionIds: string[];
        dateFrom: string;
        dateTo: string;
      },
    ) => boolean,
    base: {
      searchNorm: string;
      managerId: string;
      pipelineStatuses: PackageListPipelineStatus[];
      directionIds: string[];
      dateFrom: string;
      dateTo: string;
    },
    directionIdBySlug: Map<string, string>,
    countsUserId?: string,
    countsMyDirectionIds?: string[],
  ): ContractDocumentPackageListCounts {
    const countWith = (override: Partial<typeof base> & { forceManagerId?: string | null }) => {
      const opts = {
        searchNorm: override.searchNorm ?? base.searchNorm,
        managerId:
          override.forceManagerId !== undefined
            ? (override.forceManagerId ?? '')
            : (override.managerId ?? base.managerId),
        pipelineStatuses: override.pipelineStatuses ?? base.pipelineStatuses,
        directionIds: override.directionIds ?? base.directionIds,
        dateFrom: override.dateFrom ?? base.dateFrom,
        dateTo: override.dateTo ?? base.dateTo,
      };
      return annotated.filter((item) => matchesExact(item, opts)).length;
    };

    const queue: Record<string, number> = {};
    for (const [id, statuses] of Object.entries(QUEUE_PRESET_STATUS_MAP)) {
      queue[id] = countWith({
        pipelineStatuses: statuses,
      });
    }

    const directions: Record<string, number> = {};
    for (const [, id] of directionIdBySlug.entries()) {
      directions[id] = countWith({ directionIds: [id] });
    }

    const myDirs = countsMyDirectionIds ?? [];

    return {
      scope: {
        mine: countsUserId
          ? countWith({
              forceManagerId: countsUserId,
              directionIds: [],
              pipelineStatuses: base.pipelineStatuses,
            })
          : 0,
        my_directions: myDirs.length
          ? countWith({
              forceManagerId: '',
              directionIds: myDirs,
              pipelineStatuses: base.pipelineStatuses,
            })
          : 0,
        all: countWith({
          forceManagerId: '',
          directionIds: [],
          pipelineStatuses: base.pipelineStatuses,
        }),
      },
      queue,
      directions,
    };
  }

  private sortAnnotatedPackages<
    T extends {
      pkg: {
        id: string;
        formData: unknown;
        updatedAt: Date;
        createdById: string | null;
        responsibleManagerId: string | null;
        responsibleManager?: {
          firstName: string | null;
          lastName: string | null;
          email: string;
        } | null;
        createdBy?: {
          firstName: string | null;
          lastName: string | null;
          email: string;
        } | null;
      };
      pipelineStatus: PackageListPipelineStatus;
      effectiveManagerId: string;
    },
  >(items: T[], sortBy: ContractDocumentPackageListSortBy, sortOrder: 'asc' | 'desc'): T[] {
    const mul = sortOrder === 'asc' ? 1 : -1;
    const cmpStr = (a: string, b: string) =>
      a.localeCompare(b, 'ru', { sensitivity: 'base', numeric: true });
    const customerName = (formData: unknown) => this.customerNameFromFormData(formData);
    const contractNumber = (formData: unknown) => this.displayContractNumberFromFormData(formData);
    const signingMs = (formData: unknown) => {
      if (!formData || typeof formData !== 'object') return null;
      const iso = String((formData as Record<string, unknown>).contractConcludedAt ?? '').trim();
      if (!iso) return null;
      const d = /^\d{4}-\d{2}-\d{2}/.test(iso)
        ? new Date(`${iso.slice(0, 10)}T12:00:00`)
        : new Date(iso);
      const t = d.getTime();
      return Number.isNaN(t) ? null : t;
    };
    const managerLabel = (item: T) => {
      const u = item.pkg.responsibleManager ?? item.pkg.createdBy;
      if (u) {
        const parts = [u.firstName, u.lastName].filter(Boolean);
        return parts.length ? parts.join(' ') : u.email;
      }
      return item.effectiveManagerId;
    };

    return [...items].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'contractNumber':
          cmp = cmpStr(contractNumber(a.pkg.formData), contractNumber(b.pkg.formData));
          break;
        case 'date': {
          const da = signingMs(a.pkg.formData);
          const db = signingMs(b.pkg.formData);
          if (da == null && db == null) cmp = 0;
          else if (da == null) cmp = 1;
          else if (db == null) cmp = -1;
          else cmp = da - db;
          break;
        }
        case 'status':
          cmp = PIPELINE_STATUS_ORDER[a.pipelineStatus] - PIPELINE_STATUS_ORDER[b.pipelineStatus];
          break;
        case 'customer':
          cmp = cmpStr(customerName(a.pkg.formData), customerName(b.pkg.formData));
          break;
        case 'manager':
          cmp = cmpStr(managerLabel(a), managerLabel(b));
          break;
        case 'updatedAt':
        default:
          cmp = a.pkg.updatedAt.getTime() - b.pkg.updatedAt.getTime();
          break;
      }
      if (cmp !== 0) return cmp * mul;
      return sortOrder === 'asc'
        ? a.pkg.id.localeCompare(b.pkg.id)
        : b.pkg.id.localeCompare(a.pkg.id);
    });
  }

  async findOne(id: string, options?: { allowTrashed?: boolean }) {
    const row = await this.prisma.contractDocumentPackage.findUnique({
      where: { id },
      include: contractDocumentPackageInclude,
    });
    if (!row) {
      throw new NotFoundException('Пакет документов не найден');
    }
    if (row.deletedAt && !options?.allowTrashed) {
      throw new NotFoundException('Пакет документов не найден');
    }
    return row;
  }

  async findTrash(
    kind: ContractDocumentPackageKind,
    params?: { search?: string; page?: number; limit?: number },
  ) {
    const page = params?.page ?? 1;
    const limit = Math.min(Math.max(params?.limit ?? 25, 1), 100);
    const skip = (page - 1) * limit;
    const searchNorm = params?.search?.trim().toLowerCase() ?? '';

    const rows = await this.prisma.contractDocumentPackage.findMany({
      where: { kind, deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      include: {
        deletedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        crmContract: {
          select: {
            customerName: true,
          },
        },
      },
    });

    const filtered = searchNorm
      ? rows.filter((pkg) => this.packageMatchesTrashSearch(pkg, searchNorm))
      : rows;
    const total = filtered.length;
    const pageRows = filtered.slice(skip, skip + limit);

    return {
      data: pageRows.map((pkg) => ({
        id: pkg.id,
        contractNumber: this.displayContractNumberFromFormData(pkg.formData),
        customerName: this.customerNameFromFormData(pkg.formData),
        title: pkg.title,
        deletedAt: pkg.deletedAt!.toISOString(),
        deletedBy: pkg.deletedBy,
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async update(id: string, dto: UpdateContractDocumentPackageDto, savedById?: string | null) {
    const row = await this.findOne(id);
    if (dto.crmContractId) {
      await this.assertCrmContractExists(dto.crmContractId);
    }
    if (dto.formData !== undefined && row.kind === ContractDocumentPackageKind.REPAIR) {
      await this.assertRepairEstimatePresetsExclusive(id, dto.formData, {
        previousFormData: row.formData,
      });
    }
    const responsibleManagerId =
      dto.responsibleManagerId !== undefined
        ? await this.resolveResponsibleManagerId(dto.responsibleManagerId, null)
        : dto.formData !== undefined
          ? await this.resolveResponsibleManagerId(
              this.extractSignatoryCrmUserId(dto.formData) ?? row.responsibleManagerId,
              null,
            )
          : undefined;
    const recordVersion = dto.recordVersion === true;
    const updated = await this.prisma.contractDocumentPackage.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.formData !== undefined ? { formData: dto.formData as Prisma.InputJsonValue } : {}),
        ...(dto.crmContractId !== undefined ? { crmContractId: dto.crmContractId } : {}),
        ...(responsibleManagerId !== undefined ? { responsibleManagerId } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
      include: contractDocumentPackageInclude,
    });
    if (recordVersion) {
      await this.appendPackageVersion(
        id,
        {
          title: updated.title,
          formData: updated.formData as Prisma.InputJsonValue,
          crmContractId: updated.crmContractId,
          status: updated.status,
        },
        savedById ?? null,
      );
    }
    return this.findOne(id);
  }

  async listVersions(packageId: string) {
    await this.findOne(packageId);
    const versions = await this.prisma.contractDocumentPackageVersion.findMany({
      where: { packageId },
      orderBy: { versionNumber: 'desc' },
      select: {
        id: true,
        packageId: true,
        versionNumber: true,
        title: true,
        status: true,
        crmContractId: true,
        formData: true,
        createdAt: true,
        savedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    return versions.map(({ formData, ...compactVersion }, index) => {
      const previous = versions[index + 1] ?? null;
      const action = this.resolveVersionAction({ index, versions });
      const keyMoments = buildPackageVersionKeyMoments({
        previous: previous
          ? {
              title: previous.title,
              status: previous.status,
              crmContractId: previous.crmContractId,
              formData: previous.formData,
            }
          : null,
        current: {
          title: compactVersion.title,
          status: compactVersion.status,
          crmContractId: compactVersion.crmContractId,
          formData,
        },
        action,
      });
      return {
        ...compactVersion,
        action,
        keyMoments,
      };
    });
  }

  async getVersion(packageId: string, versionId: string) {
    await this.findOne(packageId);
    const row = await this.prisma.contractDocumentPackageVersion.findFirst({
      where: { id: versionId, packageId },
      include: {
        savedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    if (!row) {
      throw new NotFoundException('Версия не найдена');
    }
    return row;
  }

  async moveToTrash(id: string, actorUserId?: string) {
    const row = await this.findOne(id);
    if (row.deletedAt) {
      throw new BadRequestException('Договор уже в корзине');
    }
    if (row.kind === ContractDocumentPackageKind.REPAIR) {
      const paymentCount = await this.prisma.contractDocumentPackagePayment.count({
        where: { packageId: id },
      });
      if (paymentCount > 0) {
        throw new BadRequestException(
          'Нельзя удалить пакет с зарегистрированными оплатами. Сначала удалите записи об оплатах.',
        );
      }
      const estimatePresetIds = this.extractRepairEstimatePresetIds(row.formData);
      if (estimatePresetIds.length > 0) {
        throw new BadRequestException(
          'Нельзя удалить договор с прикреплённой сметой. Сначала отвяжите расчёты на вкладке «Смета».',
        );
      }
    }
    return this.prisma.contractDocumentPackage.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: actorUserId ?? null,
      },
      include: contractDocumentPackageInclude,
    });
  }

  async restoreFromTrash(id: string) {
    const row = await this.findOne(id, { allowTrashed: true });
    if (!row.deletedAt) {
      throw new BadRequestException('Договор не в корзине');
    }
    if (row.kind === ContractDocumentPackageKind.REPAIR && row.formData !== undefined) {
      await this.assertRepairEstimatePresetsExclusive(id, row.formData);
    }
    return this.prisma.contractDocumentPackage.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedById: null,
      },
      include: contractDocumentPackageInclude,
    });
  }

  async remove(id: string, actorUserId?: string) {
    return this.moveToTrash(id, actorUserId);
  }

  private async assertCrmContractExists(contractId: string) {
    const row = await this.prisma.contract.findUnique({
      where: { id: contractId },
      select: { id: true },
    });
    if (!row) {
      throw new BadRequestException('Указан несуществующий договор CRM');
    }
  }

  private packageMatchesListSearch(
    pkg: {
      title: string | null;
      formData: unknown;
      documentObject?: {
        name?: string | null;
        customerName?: string | null;
        address?: string | null;
      } | null;
    },
    searchNorm: string,
  ): boolean {
    const haystack = [
      pkg.title ?? '',
      pkg.documentObject?.name ?? '',
      pkg.documentObject?.customerName ?? '',
      pkg.documentObject?.address ?? '',
      this.displayContractNumberFromFormData(pkg.formData),
      this.customerNameFromFormData(pkg.formData),
      this.objectAddressFromFormData(pkg.formData),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(searchNorm);
  }

  private objectAddressFromFormData(formData: unknown): string {
    if (!formData || typeof formData !== 'object') return '';
    const fd = formData as Record<string, unknown>;
    const object =
      fd.object && typeof fd.object === 'object' ? (fd.object as Record<string, unknown>) : null;
    if (!object) return '';
    const address = typeof object.address === 'string' ? object.address.trim() : '';
    return address;
  }

  private extractSignatoryCrmUserId(formData: unknown): string | null {
    if (!formData || typeof formData !== 'object') return null;
    const executor = (formData as Record<string, unknown>).executor;
    if (!executor || typeof executor !== 'object') return null;
    const id = (executor as Record<string, unknown>).signatoryCrmUserId;
    return typeof id === 'string' && id.trim() ? id.trim() : null;
  }

  private async resolveResponsibleManagerId(
    candidateId: string | null | undefined,
    fallbackUserId?: string | null,
  ): Promise<string | null> {
    const trimmed = candidateId?.trim();
    const resolvedId = trimmed && trimmed.length > 0 ? trimmed : (fallbackUserId?.trim() ?? '');
    if (!resolvedId) return null;
    const user = await this.prisma.user.findUnique({
      where: { id: resolvedId },
      select: { id: true },
    });
    if (!user) {
      throw new BadRequestException('Указан несуществующий ответственный менеджер');
    }
    return user.id;
  }

  private extractRepairEstimatePresetIds(formData: unknown): string[] {
    if (!formData || typeof formData !== 'object') return [];
    const est = (formData as Record<string, unknown>).estimate;
    if (!est || typeof est !== 'object') return [];
    const e = est as Record<string, unknown>;
    const ids: string[] = [];
    if (typeof e.selectedPresetId === 'string' && e.selectedPresetId.trim()) {
      ids.push(e.selectedPresetId.trim());
    }
    if (Array.isArray(e.selectedPresetIds)) {
      for (const x of e.selectedPresetIds) {
        if (typeof x === 'string' && x.trim()) ids.push(x.trim());
      }
    }
    return [...new Set(ids)];
  }

  private async assertRepairEstimatePresetsExclusive(
    currentPackageId: string | null,
    formData: unknown,
    options?: { previousFormData?: unknown },
  ): Promise<void> {
    const ids = this.extractRepairEstimatePresetIds(formData);
    if (ids.length === 0) return;

    const previousIdsList =
      options?.previousFormData !== undefined
        ? this.extractRepairEstimatePresetIds(options.previousFormData)
        : null;
    if (previousIdsList !== null) {
      const previousSet = new Set(previousIdsList);
      const unchanged =
        ids.length === previousIdsList.length && ids.every((id) => previousSet.has(id));
      if (unchanged) return;
    }

    const previousIds = previousIdsList !== null ? new Set(previousIdsList) : null;
    const idsToValidatePipeline = previousIds ? ids.filter((id) => !previousIds.has(id)) : ids;
    if (idsToValidatePipeline.length > 0) {
      await this.estimatePresets.assertPipelineActive(idsToValidatePipeline);
    }

    const others = await this.prisma.contractDocumentPackage.findMany({
      where: {
        kind: ContractDocumentPackageKind.REPAIR,
        deletedAt: null,
        ...(currentPackageId ? { NOT: { id: currentPackageId } } : {}),
      },
      select: { id: true, formData: true },
    });
    for (const pkg of others) {
      const otherIds = this.extractRepairEstimatePresetIds(pkg.formData);
      const conflict = ids.find((id) => otherIds.includes(id));
      if (conflict) {
        throw new BadRequestException(
          'Этот расчёт уже прикреплён к другому договору. Сначала отвяжите его в том пакете или выберите другой расчёт.',
        );
      }
    }
  }

  private displayContractNumberFromFormData(formData: unknown): string {
    if (!formData || typeof formData !== 'object') return '—';
    const fd = formData as Record<string, unknown>;
    const contract =
      fd.contract && typeof fd.contract === 'object'
        ? (fd.contract as Record<string, unknown>)
        : null;
    const num = typeof contract?.number === 'string' ? contract.number.trim() : '';
    return num || '—';
  }

  private customerNameFromFormData(formData: unknown): string {
    if (!formData || typeof formData !== 'object') return '—';
    const fd = formData as Record<string, unknown>;
    const c =
      fd.customer && typeof fd.customer === 'object'
        ? (fd.customer as Record<string, unknown>)
        : null;
    if (!c) return '—';
    const type = c.type;
    if (type === 'COMPANY' || type === 'ENTREPRENEUR') {
      const org = typeof c.organizationName === 'string' ? c.organizationName.trim() : '';
      return org || '—';
    }
    const full = typeof c.fullName === 'string' ? c.fullName.trim() : '';
    return full || '—';
  }

  private packageMatchesTrashSearch(
    pkg: {
      title: string | null;
      formData: unknown;
      crmContract: { customerName: string | null } | null;
    },
    searchNorm: string,
  ): boolean {
    const haystack = [
      this.displayContractNumberFromFormData(pkg.formData),
      this.customerNameFromFormData(pkg.formData),
      pkg.crmContract?.customerName ?? '',
      pkg.title ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(searchNorm);
  }

  private async appendPackageVersion(
    packageId: string,
    snapshot: {
      title: string | null;
      formData: Prisma.InputJsonValue;
      crmContractId: string | null;
      status: ContractDocumentPackageStatus;
    },
    savedById?: string | null,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const latest = await tx.contractDocumentPackageVersion.findFirst({
        where: { packageId },
        orderBy: { versionNumber: 'desc' },
        select: {
          title: true,
          formData: true,
          crmContractId: true,
          status: true,
        },
      });
      if (
        latest &&
        this.buildVersionSnapshotSignature(latest) === this.buildVersionSnapshotSignature(snapshot)
      ) {
        return;
      }
      const agg = await tx.contractDocumentPackageVersion.aggregate({
        where: { packageId },
        _max: { versionNumber: true },
      });
      const next = (agg._max.versionNumber ?? 0) + 1;
      await tx.contractDocumentPackageVersion.create({
        data: {
          packageId,
          versionNumber: next,
          title: snapshot.title,
          formData: snapshot.formData,
          crmContractId: snapshot.crmContractId,
          status: snapshot.status,
          savedById: savedById ?? null,
        },
      });
    });
  }

  private buildVersionSnapshotSignature(snapshot: {
    title: string | null;
    status: ContractDocumentPackageStatus;
    crmContractId: string | null;
    formData: unknown;
  }): string {
    return JSON.stringify({
      title: snapshot.title ?? null,
      status: snapshot.status,
      crmContractId: snapshot.crmContractId ?? null,
      formData: snapshot.formData ?? {},
    });
  }

  private resolveVersionAction(args: {
    index: number;
    versions: Array<{
      title: string | null;
      status: ContractDocumentPackageStatus;
      crmContractId: string | null;
      formData: unknown;
    }>;
  }): 'CREATE' | 'UPDATE' | 'ROLLBACK' {
    const { index, versions } = args;
    if (index === versions.length - 1) return 'CREATE';
    const current = versions[index];
    const currentSignature = this.buildVersionSnapshotSignature(current);
    for (let i = index + 2; i < versions.length; i += 1) {
      if (this.buildVersionSnapshotSignature(versions[i]) === currentSignature) {
        return 'ROLLBACK';
      }
    }
    return 'UPDATE';
  }
}
