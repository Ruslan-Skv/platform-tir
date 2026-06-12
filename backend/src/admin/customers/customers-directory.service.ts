import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ContractsService } from '../contracts/contracts.service';
import { computeCrmCustomerProfileFillPercent } from './crm-customer-fill-percent.util';
import { parseObjectAddressesFromExtendedProfile } from './crm-object-addresses.util';

function digitsPhone(s: string | null | undefined): string {
  return (s ?? '').replace(/\D/g, '');
}

const customerAuditUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
} as const;

@Injectable()
export class CustomersDirectoryService {
  constructor(
    private prisma: PrismaService,
    private contractsService: ContractsService,
  ) {}

  private resolveCustomerEntityType(customer: {
    entityType: string | null;
    extendedProfile: unknown;
  }): 'PERSON' | 'COMPANY' | 'ENTREPRENEUR' {
    if (
      customer.entityType === 'PERSON' ||
      customer.entityType === 'COMPANY' ||
      customer.entityType === 'ENTREPRENEUR'
    ) {
      return customer.entityType;
    }
    const ext = customer.extendedProfile as Record<string, unknown> | null;
    const t = ext?.type;
    if (t === 'COMPANY' || t === 'ENTREPRENEUR') return t;
    return 'PERSON';
  }

  /**
   * Единый справочник: карточки клиентов + заказчики только по договорам (без `customer_id`),
   * если их телефон не совпадает с уже заведённой карточкой.
   */
  async findClientDirectory(params?: {
    search?: string;
    entityType?: string;
    /** ID пользователя или `_none` — карточки без указанного автора */
    createdById?: string;
    page?: number;
    limit?: number;
    sortBy?: 'displayName' | 'createdAt' | 'lastMeasurementDate' | 'lastContractDate';
    sortOrder?: 'asc' | 'desc';
    /** По одной строке на каждый адрес объекта (для поиска заказчика в формах). */
    expandObjectAddresses?: boolean;
  }) {
    const page = params?.page ?? 1;
    const limit = Math.min(Math.max(params?.limit ?? 25, 1), 100);
    const skip = (page - 1) * limit;
    const entityType =
      params?.entityType && ['PERSON', 'COMPANY', 'ENTREPRENEUR'].includes(params.entityType)
        ? params.entityType
        : undefined;

    const where: Prisma.CustomerWhereInput = { deletedAt: null };
    if (entityType) {
      where.entityType = entityType;
    }
    if (params?.search?.trim()) {
      const search = params.search.trim();
      const t = search;
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { phones: { has: t } },
        { extendedProfile: { string_contains: search } },
      ];
    }

    const createdByFilter = params?.createdById?.trim();
    if (createdByFilter) {
      if (createdByFilter === '_none') {
        where.createdById = null;
      } else {
        where.createdById = createdByFilter;
      }
    }

    const FETCH_CAP = 5000;
    const dbCustomers = await this.prisma.customer.findMany({
      where,
      include: {
        manager: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        createdBy: { select: customerAuditUserSelect },
      },
      orderBy: { createdAt: 'desc' },
      take: FETCH_CAP,
    });

    const digitSet = new Set<string>();
    for (const c of dbCustomers) {
      const d = digitsPhone(c.phone);
      if (d.length >= 10) digitSet.add(d);
      for (const p of c.phones ?? []) {
        const pd = digitsPhone(p);
        if (pd.length >= 10) digitSet.add(pd);
      }
    }

    type ContractParty = Awaited<
      ReturnType<ContractsService['getCustomersFromContracts']>
    >['customers'][number];

    let orphanParties: ContractParty[] = [];
    if (!entityType && !createdByFilter) {
      const { customers: contractParties } = await this.contractsService.getCustomersFromContracts(
        params?.search,
      );
      orphanParties = contractParties.filter((x) => !x.customerId);
      orphanParties = orphanParties.filter((o) => {
        const d = digitsPhone(o.customerPhone);
        if (d.length >= 10 && digitSet.has(d)) return false;
        return true;
      });
    }

    const sortBy =
      params?.sortBy === 'createdAt' ||
      params?.sortBy === 'lastMeasurementDate' ||
      params?.sortBy === 'lastContractDate'
        ? params.sortBy
        : 'displayName';
    const sortOrder = params?.sortOrder === 'desc' ? 'desc' : 'asc';

    type Merged = {
      nameKey: string;
      createdKey: number;
      lastMeasurementKey: number;
      lastContractKey: number;
      row: Record<string, unknown>;
    };
    const merged: Merged[] = [];

    const statsByCustomerId = await this.buildDirectoryStatsForCustomers(
      dbCustomers.map((c) => c.id),
    );

    const expandObjectAddresses = params?.expandObjectAddresses === true;

    for (const c of dbCustomers) {
      const baseRow = this.serializeCustomerDirectoryRow(c, statsByCustomerId.get(c.id));
      const rows = expandObjectAddresses
        ? this.expandCustomerDirectoryRowsByObjectAddresses(baseRow, c)
        : [baseRow];
      for (const row of rows) {
        merged.push({
          nameKey: String(row['displayName'] ?? '').toLowerCase(),
          createdKey: c.createdAt.getTime(),
          lastMeasurementKey: this.directoryDateSortKey(row['lastMeasurementDate']),
          lastContractKey: this.directoryDateSortKey(row['lastContractDate']),
          row,
        });
      }
    }
    for (const o of orphanParties) {
      const row = this.serializeContractOnlyDirectoryRow(o);
      merged.push({
        nameKey: String(row['displayName'] ?? '').toLowerCase(),
        createdKey: 0,
        lastMeasurementKey: this.directoryDateSortKey(row['lastMeasurementDate']),
        lastContractKey: this.directoryDateSortKey(row['lastContractDate']),
        row,
      });
    }

    merged.sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      const compareWithEmptyLast = (aEmpty: boolean, bEmpty: boolean, cmp: number) => {
        if (aEmpty && bEmpty) return a.nameKey.localeCompare(b.nameKey, 'ru');
        if (aEmpty) return sortOrder === 'asc' ? 1 : -1;
        if (bEmpty) return sortOrder === 'asc' ? -1 : 1;
        return cmp * dir;
      };

      if (sortBy === 'createdAt') {
        return compareWithEmptyLast(
          a.createdKey === 0,
          b.createdKey === 0,
          a.createdKey - b.createdKey,
        );
      }
      if (sortBy === 'lastMeasurementDate') {
        return compareWithEmptyLast(
          a.lastMeasurementKey === 0,
          b.lastMeasurementKey === 0,
          a.lastMeasurementKey - b.lastMeasurementKey,
        );
      }
      if (sortBy === 'lastContractDate') {
        return compareWithEmptyLast(
          a.lastContractKey === 0,
          b.lastContractKey === 0,
          a.lastContractKey - b.lastContractKey,
        );
      }
      return a.nameKey.localeCompare(b.nameKey, 'ru') * dir;
    });
    const total = merged.length;
    const slice = merged.slice(skip, skip + limit);
    return {
      data: slice.map((m) => m.row),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  private async buildDirectoryStatsForCustomers(customerIds: string[]): Promise<
    Map<
      string,
      {
        contractCount: number;
        totalAmount: number;
        lastContractDate: string | null;
        lastContractNumber: string | null;
        lastMeasurementDate: string | null;
        measurementCount: number;
      }
    >
  > {
    const map = new Map<
      string,
      {
        contractCount: number;
        totalAmount: number;
        lastContractDate: string | null;
        lastContractNumber: string | null;
        lastMeasurementDate: string | null;
        measurementCount: number;
      }
    >();
    if (customerIds.length === 0) return map;

    const contracts = await this.prisma.contract.findMany({
      where: { customerId: { in: customerIds } },
      select: {
        customerId: true,
        contractDate: true,
        contractNumber: true,
        totalAmount: true,
      },
      orderBy: { contractDate: 'desc' },
    });
    for (const row of contracts) {
      if (!row.customerId) continue;
      const cur = map.get(row.customerId) ?? {
        contractCount: 0,
        totalAmount: 0,
        lastContractDate: null,
        lastContractNumber: null,
        lastMeasurementDate: null,
        measurementCount: 0,
      };
      cur.contractCount += 1;
      cur.totalAmount += Number(row.totalAmount ?? 0);
      if (!cur.lastContractDate) {
        cur.lastContractDate = row.contractDate.toISOString().slice(0, 10);
        cur.lastContractNumber = row.contractNumber;
      }
      map.set(row.customerId, cur);
    }

    const measurements = await this.prisma.measurement.findMany({
      where: { customerId: { in: customerIds } },
      select: { customerId: true, receptionDate: true },
      orderBy: { receptionDate: 'desc' },
    });
    for (const row of measurements) {
      if (!row.customerId) continue;
      const cur = map.get(row.customerId) ?? {
        contractCount: 0,
        totalAmount: 0,
        lastContractDate: null,
        lastContractNumber: null,
        lastMeasurementDate: null,
        measurementCount: 0,
      };
      cur.measurementCount += 1;
      if (!cur.lastMeasurementDate) {
        cur.lastMeasurementDate = row.receptionDate.toISOString().slice(0, 10);
      }
      map.set(row.customerId, cur);
    }

    return map;
  }

  /** Отображаемое ФИО физлица из extendedProfile и колонок Customer. */
  private resolvePersonDisplayName(customer: {
    firstName: string;
    lastName: string | null;
    extendedProfile: unknown;
  }): string {
    const ext = (customer.extendedProfile ?? {}) as Record<string, unknown>;
    const str = (key: string) => {
      const v = ext[key];
      return typeof v === 'string' ? v.trim() : '';
    };
    const extLn = str('lastName');
    const extFn = str('firstName');
    const extPat = str('patronymic');
    if (extLn || extFn || extPat) {
      return [extLn, extFn, extPat].filter(Boolean).join(' ');
    }
    const full = str('fullName');
    if (full) return full;
    const rowFn = (customer.firstName ?? '').trim();
    const rowLn = (customer.lastName ?? '').trim();
    if (rowFn && /\s/.test(rowFn) && !rowLn) return rowFn;
    return [rowLn, rowFn].filter(Boolean).join(' ');
  }

  private directoryDateSortKey(iso: unknown): number {
    if (typeof iso !== 'string' || !iso.trim()) return 0;
    const t = new Date(iso).getTime();
    return Number.isNaN(t) ? 0 : t;
  }

  private expandCustomerDirectoryRowsByObjectAddresses(
    baseRow: Record<string, unknown>,
    customer: { id: string; extendedProfile: unknown },
  ): Record<string, unknown>[] {
    const ext = (customer.extendedProfile ?? {}) as Record<string, unknown>;
    const addresses = parseObjectAddressesFromExtendedProfile(ext);
    if (addresses.length === 0) {
      return [
        {
          ...baseRow,
          objectAddress: null,
          directoryRowKey: customer.id,
        },
      ];
    }
    return addresses.map((objectAddress, index) => ({
      ...baseRow,
      objectAddress,
      directoryRowKey: `${customer.id}#obj:${index}`,
    }));
  }

  private serializeCustomerDirectoryRow(
    c: Prisma.CustomerGetPayload<{
      include: {
        manager: { select: { id: true; email: true; firstName: true; lastName: true } };
        createdBy: { select: typeof customerAuditUserSelect };
      };
    }>,
    stats?: {
      contractCount: number;
      totalAmount: number;
      lastContractDate: string | null;
      lastContractNumber: string | null;
      lastMeasurementDate: string | null;
      measurementCount: number;
    },
  ): Record<string, unknown> {
    const entityType = this.resolveCustomerEntityType(c);
    const displayName =
      entityType === 'PERSON'
        ? this.resolvePersonDisplayName(c) || c.email || c.id
        : (c.company ?? '').trim() ||
          (() => {
            const ext = (c.extendedProfile ?? {}) as Record<string, unknown>;
            const org = typeof ext.organizationName === 'string' ? ext.organizationName.trim() : '';
            return org;
          })() ||
          [c.firstName, c.lastName]
            .map((x) => (x ?? '').trim())
            .filter(Boolean)
            .join(' ') ||
          c.email ||
          c.id;
    return {
      rowSource: 'customer',
      id: c.id,
      displayName,
      email: c.email,
      phone: c.phone ?? c.phones?.[0] ?? null,
      entityType: c.entityType ?? null,
      status: c.status,
      stage: c.stage,
      createdAt: c.createdAt.toISOString(),
      manager: c.manager,
      createdBy: c.createdBy,
      contractCount: stats?.contractCount ?? 0,
      totalAmount: stats?.totalAmount ?? 0,
      lastContractDate: stats?.lastContractDate ?? null,
      lastContractNumber: stats?.lastContractNumber ?? null,
      lastMeasurementDate: stats?.lastMeasurementDate ?? null,
      measurementCount: stats?.measurementCount ?? 0,
      contractCustomer: null,
      profileFillPercent: computeCrmCustomerProfileFillPercent(c),
    };
  }

  private serializeContractOnlyDirectoryRow(
    o: Awaited<ReturnType<ContractsService['getCustomersFromContracts']>>['customers'][number],
  ): Record<string, unknown> {
    const displayName = (o.customerName ?? '').trim() || '—';
    const phoneKey = (o.customerPhone ?? '').trim();
    return {
      rowSource: 'contract_only',
      id: `contract-only:${displayName}|${phoneKey}`,
      displayName,
      email: null,
      phone: o.customerPhone ?? null,
      entityType: (() => {
        const doc = o.documentCustomer as unknown;
        if (doc && typeof doc === 'object' && 'type' in doc) {
          const t = (doc as { type?: unknown }).type;
          return typeof t === 'string' && t.trim() ? t : null;
        }
        return null;
      })(),
      status: null,
      stage: null,
      createdAt: null,
      manager: o.manager,
      createdBy: null,
      contractCount: o.contractCount,
      totalAmount: Number(o.totalAmount ?? 0),
      lastContractDate: o.lastContractDate,
      lastContractNumber: o.lastContractNumber ?? null,
      lastMeasurementDate: null,
      measurementCount: 0,
      contractCustomer: o,
    };
  }
}
