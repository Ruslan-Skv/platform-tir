import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { ContractsService } from '../contracts/contracts.service';
import { Prisma } from '@prisma/client';
import {
  buildCustomerHistorySnapshot,
  computeCustomerHistoryChangedFields,
  customerRowAfterUpdate,
} from './customer-history.util';
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

const customerDetailInclude = {
  manager: { select: customerAuditUserSelect },
  createdBy: { select: customerAuditUserSelect },
  updatedBy: { select: customerAuditUserSelect },
} as const;

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private contractsService: ContractsService,
  ) {}

  private collectExistingPhones(customer: { phone: string | null; phones: string[] }): string[] {
    const list = (
      customer.phones?.length ? customer.phones : customer.phone ? [customer.phone] : []
    )
      .map((p) => p.trim())
      .filter(Boolean);
    const unique: string[] = [];
    for (const p of list) {
      if (!unique.some((x) => digitsPhone(x) === digitsPhone(p))) unique.push(p);
    }
    return unique;
  }

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

  private assertExistingPhonesPreserved(existingPhones: string[], nextPhones: string[]): void {
    for (const ep of existingPhones) {
      const epDigits = digitsPhone(ep);
      const found = nextPhones.some((p) => digitsPhone(p) === epDigits);
      if (!found) {
        throw new BadRequestException(
          'Нельзя удалять или изменять существующие номера телефона. Можно только добавить новый.',
        );
      }
    }
  }

  /** Нормализует телефоны: порядок как в `phones`, затем одиночный `phone` без дублей; `phone` в БД = первый номер. */
  private normalizeCustomerPhones(params: { phone?: string | null; phones?: string[] | null }): {
    phone: string | null;
    phones: string[];
  } {
    if (params.phone === null && params.phones === undefined) {
      return { phone: null, phones: [] };
    }
    const out: string[] = [];
    const add = (s: string | null | undefined) => {
      const t = (s ?? '').trim();
      if (t && !out.includes(t)) out.push(t);
    };
    if (params.phones != null) {
      for (const p of params.phones) add(p);
    }
    if (params.phone !== undefined && params.phone !== null) {
      add(params.phone);
    }
    return { phone: out[0] ?? null, phones: out };
  }

  async create(createCustomerDto: CreateCustomerDto, actorUserId?: string) {
    const { extendedProfile, dealValue, nextFollowUp, phone, phones, email, ...rest } =
      createCustomerDto;
    const emailResolved =
      email != null && String(email).trim() !== '' ? String(email).trim() : null;
    const { phone: primary, phones: list } = this.normalizeCustomerPhones({ phone, phones });
    const created = await this.prisma.customer.create({
      data: {
        ...rest,
        email: emailResolved,
        phone: primary,
        phones: list,
        dealValue: dealValue != null ? new Prisma.Decimal(dealValue) : null,
        nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : null,
        extendedProfile:
          extendedProfile != null ? (extendedProfile as Prisma.InputJsonValue) : undefined,
        createdById: actorUserId ?? null,
        updatedById: actorUserId ?? null,
      },
      include: customerDetailInclude,
    });

    if (actorUserId) {
      const snap = buildCustomerHistorySnapshot(created);
      const changedFields = Object.keys(snap).filter((key) => {
        const v = snap[key];
        if (Array.isArray(v)) return v.length > 0;
        return v !== null && v !== undefined && String(v).trim() !== '';
      });
      await this.prisma.customerHistory.create({
        data: {
          customerId: created.id,
          snapshot: snap as Prisma.InputJsonValue,
          changedFields,
          action: 'CREATE',
          changedById: actorUserId,
        },
      });
    }

    return created;
  }

  async findAll(params?: {
    status?: string;
    stage?: string;
    managerId?: string;
    search?: string;
    /** PERSON | COMPANY | ENTREPRENEUR — колонка `entity_type` */
    entityType?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, stage, managerId, search, entityType, page = 1, limit = 20 } = params || {};
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = { deletedAt: null };

    if (status) {
      where.status = status as Prisma.EnumCustomerStatusFilter;
    }

    if (stage) {
      where.stage = stage as
        | 'NEW'
        | 'CONTACTED'
        | 'QUALIFIED'
        | 'PROPOSAL'
        | 'NEGOTIATION'
        | 'WON'
        | 'LOST';
    }

    if (managerId) {
      where.managerId = managerId;
    }

    if (entityType && ['PERSON', 'COMPANY', 'ENTREPRENEUR'].includes(entityType)) {
      where.entityType = entityType;
    }

    if (search) {
      const t = search.trim();
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { phones: { has: t } },
      ];
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
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
          _count: {
            select: {
              interactions: true,
              tasks: true,
              deals: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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

  private async assertCustomerExists(id: string, options?: { allowTrashed?: boolean }) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    if (!options?.allowTrashed && customer.deletedAt) {
      throw new NotFoundException('Карточка клиента находится в корзине');
    }
    return customer;
  }

  async findOne(id: string) {
    await this.assertCustomerExists(id);
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        ...customerDetailInclude,
        contracts: {
          select: {
            id: true,
            contractNumber: true,
            contractDate: true,
            totalAmount: true,
          },
          orderBy: { contractDate: 'desc' },
        },
        measurements: {
          select: {
            id: true,
            receptionDate: true,
            status: true,
            customerName: true,
          },
          orderBy: { receptionDate: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    const contractIds = customer.contracts.map((c) => c.id);
    const packages =
      contractIds.length > 0
        ? await this.prisma.contractDocumentPackage.findMany({
            where: { crmContractId: { in: contractIds } },
            select: { id: true, crmContractId: true },
          })
        : [];
    const packageByContract = new Map(
      packages
        .filter((p): p is { id: string; crmContractId: string } => Boolean(p.crmContractId))
        .map((p) => [p.crmContractId, p.id]),
    );

    const {
      contracts,
      measurements,
      dealValue,
      lastContactAt,
      nextFollowUp,
      createdAt,
      updatedAt,
      ...rest
    } = customer;

    return {
      ...rest,
      dealValue: dealValue != null ? Number(dealValue) : null,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      lastContactAt: lastContactAt?.toISOString() ?? null,
      nextFollowUp: nextFollowUp?.toISOString() ?? null,
      contracts: contracts.map((c) => ({
        id: c.id,
        contractNumber: c.contractNumber,
        contractDate: c.contractDate.toISOString().slice(0, 10),
        totalAmount: Number(c.totalAmount),
        documentPackageId: packageByContract.get(c.id) ?? null,
      })),
      measurements: measurements.map((m) => ({
        id: m.id,
        receptionDate: m.receptionDate.toISOString().slice(0, 10),
        status: m.status,
        customerName: m.customerName,
      })),
    };
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto, actorUserId?: string) {
    const existing = await this.assertCustomerExists(id);
    const entityType = this.resolveCustomerEntityType(existing);
    const { extendedProfile, dealValue, nextFollowUp, phone, phones, ...rest } = updateCustomerDto;
    delete rest.firstName;
    delete rest.lastName;
    delete rest.company;
    delete rest.entityType;

    const data: Prisma.CustomerUpdateInput = {
      ...rest,
      ...(actorUserId ? { updatedById: actorUserId } : {}),
      dealValue:
        dealValue !== undefined
          ? dealValue != null
            ? new Prisma.Decimal(dealValue)
            : null
          : undefined,
      nextFollowUp:
        nextFollowUp !== undefined ? (nextFollowUp ? new Date(nextFollowUp) : null) : undefined,
    };

    if (extendedProfile !== undefined) {
      const ext0 = (existing.extendedProfile ?? {}) as Record<string, unknown>;
      const incoming = extendedProfile === null ? {} : (extendedProfile as Record<string, unknown>);
      const merged: Record<string, unknown> = { ...ext0, ...incoming, type: entityType };

      if (entityType === 'PERSON') {
        for (const key of ['lastName', 'firstName', 'patronymic'] as const) {
          const v = ext0[key];
          if (typeof v === 'string' && v.trim()) {
            merged[key] = v;
          }
        }
      } else {
        const org =
          (typeof ext0.organizationName === 'string' && ext0.organizationName.trim()) ||
          existing.company?.trim() ||
          '';
        if (org) merged.organizationName = org;
      }

      data.extendedProfile = merged as Prisma.InputJsonValue;
    }

    if (phone !== undefined || phones !== undefined) {
      const existingPhones = this.collectExistingPhones(existing);
      const { phone: primary, phones: list } = this.normalizeCustomerPhones({
        phone: phone !== undefined ? phone : undefined,
        phones: phones !== undefined ? phones : undefined,
      });
      this.assertExistingPhonesPreserved(existingPhones, list);
      data.phone = primary;
      data.phones = list;
    }

    if (actorUserId) {
      const snapshotBefore = buildCustomerHistorySnapshot(existing);
      const afterRow = customerRowAfterUpdate(existing, {
        email: data.email !== undefined ? (data.email as string | null) : undefined,
        phone: data.phone !== undefined ? (data.phone as string | null) : undefined,
        phones: data.phones !== undefined ? (data.phones as string[]) : undefined,
        notes: data.notes !== undefined ? (data.notes as string | null) : undefined,
        company: data.company !== undefined ? (data.company as string | null) : undefined,
        position: data.position !== undefined ? (data.position as string | null) : undefined,
        extendedProfile: data.extendedProfile !== undefined ? data.extendedProfile : undefined,
      });
      const snapshotAfter = buildCustomerHistorySnapshot(afterRow);
      const changedFields = computeCustomerHistoryChangedFields(snapshotBefore, snapshotAfter);
      if (changedFields.length > 0) {
        await this.prisma.customerHistory.create({
          data: {
            customerId: id,
            snapshot: snapshotBefore as Prisma.InputJsonValue,
            changedFields,
            action: 'UPDATE',
            changedById: actorUserId,
          },
        });
      }
    }

    return this.prisma.customer.update({
      where: { id },
      data,
      include: customerDetailInclude,
    });
  }

  async getHistory(customerId: string) {
    await this.assertCustomerExists(customerId, { allowTrashed: true });

    const history = await this.prisma.customerHistory.findMany({
      where: { customerId },
      include: {
        changedBy: { select: customerAuditUserSelect },
      },
      orderBy: { changedAt: 'desc' },
    });

    return history.map((h) => ({
      id: h.id,
      action: h.action,
      changedAt: h.changedAt.toISOString(),
      changedBy: h.changedBy,
      changedFields: h.changedFields,
      snapshot: h.snapshot as Record<string, unknown>,
    }));
  }

  async findTrash(params?: { search?: string; page?: number; limit?: number }) {
    const page = params?.page ?? 1;
    const limit = Math.min(Math.max(params?.limit ?? 25, 1), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = { deletedAt: { not: null } };
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
      ];
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        include: { updatedBy: { select: customerAuditUserSelect } },
        orderBy: { deletedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.customer.count({ where }),
    ]);

    const data = customers.map((c) => {
      const entityType = this.resolveCustomerEntityType(c);
      const displayName =
        entityType === 'PERSON'
          ? this.resolvePersonDisplayName(c) || c.email || c.id
          : (c.company ?? '').trim() ||
            (() => {
              const ext = (c.extendedProfile ?? {}) as Record<string, unknown>;
              const org =
                typeof ext.organizationName === 'string' ? ext.organizationName.trim() : '';
              return org;
            })() ||
            [c.firstName, c.lastName]
              .map((x) => (x ?? '').trim())
              .filter(Boolean)
              .join(' ') ||
            c.email ||
            c.id;
      return {
        id: c.id,
        displayName,
        email: c.email,
        phone: c.phone ?? c.phones?.[0] ?? null,
        entityType: c.entityType ?? null,
        deletedAt: c.deletedAt!.toISOString(),
        deletedBy: c.updatedBy,
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async moveToTrash(id: string, actorUserId?: string) {
    const existing = await this.assertCustomerExists(id);
    if (existing.deletedAt) {
      throw new BadRequestException('Карточка уже в корзине');
    }
    return this.prisma.customer.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        ...(actorUserId ? { updatedById: actorUserId } : {}),
      },
    });
  }

  async restoreFromTrash(id: string, actorUserId?: string) {
    const existing = await this.assertCustomerExists(id, { allowTrashed: true });
    if (!existing.deletedAt) {
      throw new BadRequestException('Карточка не в корзине');
    }
    return this.prisma.customer.update({
      where: { id },
      data: {
        deletedAt: null,
        ...(actorUserId ? { updatedById: actorUserId } : {}),
      },
    });
  }

  async addInteraction(userId: string, createInteractionDto: CreateInteractionDto) {
    await this.assertCustomerExists(createInteractionDto.customerId);

    const interaction = await this.prisma.interaction.create({
      data: {
        ...createInteractionDto,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Update last contact date
    await this.prisma.customer.update({
      where: { id: createInteractionDto.customerId },
      data: { lastContactAt: new Date() },
    });

    return interaction;
  }

  async getInteractions(customerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [interactions, total] = await Promise.all([
      this.prisma.interaction.findMany({
        where: { customerId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.interaction.count({ where: { customerId } }),
    ]);

    return {
      data: interactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Sales funnel statistics
  async getFunnelStats(managerId?: string) {
    const where: Prisma.CustomerWhereInput = managerId ? { managerId } : {};

    const stages = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

    const stats = await Promise.all(
      stages.map(async (stage) => {
        type CustomerStage =
          | 'NEW'
          | 'CONTACTED'
          | 'QUALIFIED'
          | 'PROPOSAL'
          | 'NEGOTIATION'
          | 'WON'
          | 'LOST';
        const [count, totalValue] = await Promise.all([
          this.prisma.customer.count({
            where: { ...where, stage: stage as CustomerStage },
          }),
          this.prisma.customer.aggregate({
            where: { ...where, stage: stage as CustomerStage },
            _sum: { dealValue: true },
          }),
        ]);

        return {
          stage,
          count,
          totalValue: totalValue._sum.dealValue || 0,
        };
      }),
    );

    return stats;
  }

  // Upcoming follow-ups
  async getUpcomingFollowUps(managerId?: string, days = 7) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const where: Prisma.CustomerWhereInput = {
      nextFollowUp: {
        gte: new Date(),
        lte: endDate,
      },
    };

    if (managerId) {
      where.managerId = managerId;
    }

    return this.prisma.customer.findMany({
      where,
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { nextFollowUp: 'asc' },
    });
  }

  // Assign manager to customer
  async assignManager(customerId: string, managerId: string) {
    await this.assertCustomerExists(customerId);
    return this.prisma.customer.update({
      where: { id: customerId },
      data: { managerId },
      include: {
        manager: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }
}
