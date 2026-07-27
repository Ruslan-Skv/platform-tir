import { Injectable } from '@nestjs/common';
import { ContractDocumentPackageKind, ContractDocumentPackageStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { contractDocumentPackageInclude } from '../contract-package.include';
import {
  type PackageListPipelineStatus,
  computePackageEffectiveManagerUserId,
  computePackageListPipelineStatus,
  packageMatchesDateRange,
  packageMatchesDirectionIds,
  packageMatchesListSearch as packageFormMatchesListSearch,
} from './package-list-pipeline-status';

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
export class ContractDocumentPackageListService {
  constructor(private readonly prisma: PrismaService) {}

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
}
