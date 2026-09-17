import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { Prisma } from '@prisma/client';
import {
  buildCustomerHistorySnapshot,
  computeCustomerHistoryChangedFields,
  customerRowAfterUpdate,
} from './customer-history.util';
import { CustomersDirectoryService } from './customers-directory.service';
import { CustomersCrmService } from './customers-crm.service';
import {
  CustomerDuplicateInput,
  findDuplicateReasons,
  toDuplicateDto,
} from './customer-duplicates.util';
import {
  attributeUnlinkedDoc,
  buildCustomerDisplayNameIndex,
  buildCustomerPhoneIndex,
} from './customer-doc-attribution.util';

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
    private directory: CustomersDirectoryService,
    private crm: CustomersCrmService,
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

  /** Живые (не в корзине) карточки, совпадающие по телефону/email/ФИО+телефону. */
  async findPotentialDuplicates(input: CustomerDuplicateInput, excludeId?: string) {
    const rows = await this.prisma.customer.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
        entityType: true,
        email: true,
        phone: true,
        phones: true,
        extendedProfile: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const duplicates = rows
      .filter((row) => row.id !== excludeId)
      .map((row) => {
        const candidate = {
          ...row,
          extendedProfile: row.extendedProfile as unknown,
          deletedAt: null,
        };
        const reasons = findDuplicateReasons(input, candidate);
        if (reasons.length === 0) return null;
        const displayName =
          this.resolveCustomerEntityType(candidate) === 'PERSON'
            ? this.resolvePersonDisplayName(candidate)
            : (candidate.company ?? '').trim();
        return toDuplicateDto({ candidate, reasons }, displayName || candidate.id);
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);

    return { duplicates };
  }

  /** Блокирует создание/изменение, если найден дубль и осознанный обход не разрешён. */
  private async assertNoDuplicates(
    input: CustomerDuplicateInput & { allowDuplicate?: boolean },
    excludeId?: string,
  ) {
    if (input.allowDuplicate) return;
    const { duplicates } = await this.findPotentialDuplicates(input, excludeId);
    if (duplicates.length > 0) {
      throw new ConflictException({
        message: 'Найден существующий клиент с совпадающими данными',
        duplicates,
      });
    }
  }

  async create(createCustomerDto: CreateCustomerDto, actorUserId?: string) {
    const {
      extendedProfile,
      dealValue,
      nextFollowUp,
      phone,
      phones,
      email,
      allowDuplicate,
      ...rest
    } = createCustomerDto;
    const emailResolved =
      email != null && String(email).trim() !== '' ? String(email).trim() : null;
    const { phone: primary, phones: list } = this.normalizeCustomerPhones({ phone, phones });

    await this.assertNoDuplicates({
      phones: list,
      email: emailResolved,
      firstName: rest.firstName,
      lastName: rest.lastName,
      extendedProfile: extendedProfile ?? null,
      allowDuplicate,
    });
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

    // Непривязанные договоры/замеры (customerId = null) добавляем к карточке,
    // если совпадает телефон или полное ФИО — иначе они навсегда скрыты из карточки.
    const phoneIndex = buildCustomerPhoneIndex([
      { id: customer.id, phone: customer.phone, phones: customer.phones },
    ]);
    const displayNameIndex = buildCustomerDisplayNameIndex([
      {
        id: customer.id,
        displayName:
          this.resolveCustomerEntityType(customer) === 'PERSON'
            ? this.resolvePersonDisplayName(customer)
            : (customer.company ?? '').trim(),
      },
    ]);
    const belongsToCustomer = (doc: {
      customerName?: string | null;
      customerPhone?: string | null;
    }) => attributeUnlinkedDoc(doc, phoneIndex, displayNameIndex) === customer.id;

    const unlinkedContracts = await this.prisma.contract.findMany({
      where: { customerId: null },
      select: {
        id: true,
        contractNumber: true,
        contractDate: true,
        totalAmount: true,
        customerName: true,
        customerPhone: true,
      },
      orderBy: { contractDate: 'desc' },
    });
    const matchedUnlinkedContracts = unlinkedContracts.filter(belongsToCustomer);
    const unlinkedMeasurements = await this.prisma.measurement.findMany({
      where: { customerId: null },
      select: {
        id: true,
        receptionDate: true,
        status: true,
        customerName: true,
        customerPhone: true,
      },
      orderBy: { receptionDate: 'desc' },
    });
    const matchedUnlinkedMeasurements = unlinkedMeasurements.filter(belongsToCustomer);

    const allContracts = [
      ...customer.contracts,
      ...matchedUnlinkedContracts.map((c) => ({
        id: c.id,
        contractNumber: c.contractNumber,
        contractDate: c.contractDate,
        totalAmount: c.totalAmount,
      })),
    ].sort((a, b) => b.contractDate.getTime() - a.contractDate.getTime());
    const allMeasurements = [
      ...customer.measurements,
      ...matchedUnlinkedMeasurements.map((m) => ({
        id: m.id,
        receptionDate: m.receptionDate,
        status: m.status,
        customerName: m.customerName,
      })),
    ].sort((a, b) => b.receptionDate.getTime() - a.receptionDate.getTime());

    const contractIds = allContracts.map((c) => c.id);
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

    // relations contracts/measurements остаются в rest, но переопределяются ниже
    // объединёнными allContracts/allMeasurements (привязанные + сматченные по телефону/ФИО).
    const { dealValue, lastContactAt, nextFollowUp, createdAt, updatedAt, ...rest } = customer;

    return {
      ...rest,
      dealValue: dealValue != null ? Number(dealValue) : null,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      lastContactAt: lastContactAt?.toISOString() ?? null,
      nextFollowUp: nextFollowUp?.toISOString() ?? null,
      contracts: allContracts.map((c) => ({
        id: c.id,
        contractNumber: c.contractNumber,
        contractDate: c.contractDate.toISOString().slice(0, 10),
        totalAmount: Number(c.totalAmount),
        documentPackageId: packageByContract.get(c.id) ?? null,
      })),
      measurements: allMeasurements.map((m) => ({
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
    const { extendedProfile, dealValue, nextFollowUp, phone, phones, allowDuplicate, ...rest } =
      updateCustomerDto;
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

      const nextEmail =
        updateCustomerDto.email !== undefined
          ? updateCustomerDto.email != null && String(updateCustomerDto.email).trim() !== ''
            ? String(updateCustomerDto.email).trim()
            : null
          : existing.email;
      await this.assertNoDuplicates(
        {
          phones: list,
          email: nextEmail,
          firstName: existing.firstName,
          lastName: existing.lastName,
          extendedProfile:
            extendedProfile !== undefined
              ? (extendedProfile as Record<string, unknown>)
              : ((existing.extendedProfile ?? {}) as Record<string, unknown>),
          allowDuplicate,
        },
        id,
      );
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

  /** Количества связанных сущностей — для предупреждения перед удалением в корзину. */
  async getLinksCount(id: string) {
    await this.assertCustomerExists(id, { allowTrashed: true });
    const [deals, measurements, contracts, interactions, tasks] = await Promise.all([
      this.prisma.deal.count({ where: { customerId: id } }),
      this.prisma.measurement.count({ where: { customerId: id } }),
      this.prisma.contract.count({ where: { customerId: id } }),
      this.prisma.interaction.count({ where: { customerId: id } }),
      this.prisma.task.count({ where: { customerId: id } }),
    ]);
    const contractRows = await this.prisma.contract.findMany({
      where: { customerId: id },
      select: { id: true },
    });
    const documentPackages = await this.prisma.contractDocumentPackage.count({
      where: { crmContractId: { in: contractRows.map((c) => c.id) } },
    });
    return {
      deals,
      measurements,
      contracts,
      documentPackages,
      interactions,
      tasks,
      total: deals + measurements + contracts + documentPackages,
    };
  }

  findClientDirectory(params?: Parameters<CustomersDirectoryService['findClientDirectory']>[0]) {
    return this.directory.findClientDirectory(params);
  }

  addInteraction(userId: string, createInteractionDto: CreateInteractionDto) {
    return this.crm.addInteraction(userId, createInteractionDto);
  }

  getInteractions(customerId: string, page = 1, limit = 20) {
    return this.crm.getInteractions(customerId, page, limit);
  }

  getFunnelStats(managerId?: string) {
    return this.crm.getFunnelStats(managerId);
  }

  getUpcomingFollowUps(managerId?: string, days = 7) {
    return this.crm.getUpcomingFollowUps(managerId, days);
  }

  assignManager(customerId: string, managerId: string) {
    return this.crm.assignManager(customerId, managerId);
  }
}
