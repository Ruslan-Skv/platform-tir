import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ContractDocumentPackageKind, PaymentForm, PaymentType, Prisma } from '@prisma/client';

import { PACKAGE_DIRECTION_REGISTRY } from '../../common/config/package-direction-registry.config';
import { PrismaService } from '../../database/prisma.service';
import { computePackageEffectiveManagerUserId } from '../contract-document-packages/list-pipeline/package-list-pipeline-status';
import { CreateManagerIncassationDto } from './dto/create-manager-incassation.dto';
import { CreateManualMoneyMovementDto } from './dto/create-manual-money-movement.dto';
import { IncassationNotifyService } from './incassation-notify.service';

const PACKAGE_KIND_DIRECTION_NAME: Record<ContractDocumentPackageKind, string> = Object.fromEntries(
  PACKAGE_DIRECTION_REGISTRY.map((d) => [d.kind, d.name]),
) as Record<ContractDocumentPackageKind, string>;

/** Таб справочника «Карточки менеджеров» (см. ContractDocumentPackageGlobalLibraryService). */
const SIGNATORY_PROFILES_TAB = 'signatory_profiles';

const INCASSATION_MANAGER_INCLUDE = {
  manager: { select: { id: true, email: true, firstName: true, lastName: true } },
  submitter: { select: { id: true, email: true, firstName: true, lastName: true } },
} satisfies Prisma.ManagerIncassationInclude;

type IncassationWithManager = Prisma.ManagerIncassationGetPayload<{
  include: typeof INCASSATION_MANAGER_INCLUDE;
}>;

function contractNumberFromFormData(formData: unknown): string | null {
  if (!formData || typeof formData !== 'object') return null;
  const contract = (formData as Record<string, unknown>).contract;
  if (!contract || typeof contract !== 'object') return null;
  const num = (contract as Record<string, unknown>).number;
  return typeof num === 'string' && num.trim() ? num.trim() : null;
}

function customerNameFromFormData(formData: unknown): string | null {
  if (!formData || typeof formData !== 'object') return null;
  const customer = (formData as Record<string, unknown>).customer;
  if (!customer || typeof customer !== 'object') return null;
  const fullName = (customer as Record<string, unknown>).fullName;
  return typeof fullName === 'string' && fullName.trim() ? fullName.trim() : null;
}

/** «Офис закл.» договора (formData.contract.officeId — id из справочника офисов). */
function officeIdFromFormData(formData: unknown): string | null {
  if (!formData || typeof formData !== 'object') return null;
  const contract = (formData as Record<string, unknown>).contract;
  if (!contract || typeof contract !== 'object') return null;
  const officeId = (contract as Record<string, unknown>).officeId;
  return typeof officeId === 'string' && officeId.trim() ? officeId.trim() : null;
}

/** «Карточка менеджера (из справочника)» вкладки «Данные» (formData.executor.signatoryCrmUserId). */
function signatoryCrmUserIdFromFormData(formData: unknown): string {
  if (!formData || typeof formData !== 'object') return '';
  const executor = (formData as Record<string, unknown>).executor;
  if (!executor || typeof executor !== 'object') return '';
  const id = (executor as Record<string, unknown>).signatoryCrmUserId;
  return typeof id === 'string' ? id.trim() : '';
}

type PackagePaymentRow = {
  id: string;
  packageId: string;
  paymentDate: Date;
  amount: Prisma.Decimal;
  paymentForm: PaymentForm;
  paymentType: PaymentType;
  addendumNumber: number | null;
  basis: string | null;
  notes: string | null;
  recordedById: string | null;
  createdAt: Date;
};

@Injectable()
export class MoneyMovementsService {
  private readonly logger = new Logger(MoneyMovementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly incassationNotify: IncassationNotifyService,
  ) {}

  async findAll(params?: {
    managerId?: string;
    /** «mine» — только записи текущего пользователя (менеджера из карточки договора). */
    scope?: string;
    currentUserId?: string;
    direction?: string;
    paymentForm?: string;
    paymentType?: string;
    /** Тип записи: «manual» — ручные проводки, «auto» — автоматические по оплатам договоров. */
    entryKind?: 'manual' | 'auto';
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      managerId,
      scope,
      currentUserId,
      direction,
      paymentForm,
      paymentType,
      entryKind,
      dateFrom,
      dateTo,
      search,
      page = 1,
      limit = 20,
    } = params || {};
    const take = Math.min(Math.max(limit, 1), 200);
    const skip = (page - 1) * take;

    const where: Prisma.MoneyMovementWhereInput = {};
    if (scope === 'mine' && currentUserId) {
      where.managerId = currentUserId;
    } else if (managerId) {
      where.managerId = managerId;
    }
    if (direction) where.direction = direction;
    if (paymentForm) where.paymentForm = paymentForm as Prisma.EnumPaymentFormFilter;
    if (paymentType) where.paymentType = paymentType as Prisma.EnumPaymentTypeFilter;
    // Признак ручной проводки — тот же, что в serialize (isManual).
    if (entryKind === 'manual') {
      where.paymentType = PaymentType.OTHER;
      where.sourceId = null;
    } else if (entryKind === 'auto') {
      where.NOT = { paymentType: PaymentType.OTHER, sourceId: null };
    }
    if (dateFrom || dateTo) {
      where.paymentDate = {};
      if (dateFrom) where.paymentDate.gte = new Date(dateFrom);
      if (dateTo) where.paymentDate.lte = new Date(dateTo);
    }
    if (search?.trim()) {
      const q = search.trim();
      where.OR = [
        { contractNumber: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { basis: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [
      rawData,
      total,
      sum,
      directionSums,
      managerSumsRaw,
      directionManagerSumsRaw,
      signatoryUserIds,
    ] = await Promise.all([
      this.prisma.moneyMovement.findMany({
        where,
        include: {
          manager: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
        orderBy: [{ paymentDate: 'desc' }, { performedAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.moneyMovement.count({ where }),
      this.prisma.moneyMovement.aggregate({ where, _sum: { amount: true } }),
      // Итоги по направлениям за тот же период/фильтры — для блока итогов над фильтрами.
      this.prisma.moneyMovement.groupBy({ by: ['direction'], where, _sum: { amount: true } }),
      // Итоги по менеджерам — для графиков детальной статистики.
      this.prisma.moneyMovement.groupBy({ by: ['managerId'], where, _sum: { amount: true } }),
      // Итоги «направление × менеджер» — кто из менеджеров лидер в каждом направлении.
      this.prisma.moneyMovement.groupBy({
        by: ['direction', 'managerId'],
        where,
        _sum: { amount: true },
      }),
      this.signatoryProfileUserIds(),
    ]);

    const managerRows = signatoryUserIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: signatoryUserIds } },
          select: { id: true, email: true, firstName: true, lastName: true },
        })
      : [];

    const managers = managerRows
      .map((m) => ({
        id: m.id,
        name: [m.lastName, m.firstName].filter(Boolean).join(' ').trim() || m.email,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

    // Менеджер движения может быть не из справочника карточек — берём имена из users.
    const statsManagerIds = [
      ...new Set(
        managerSumsRaw.map((row) => row.managerId).filter((id): id is string => Boolean(id)),
      ),
    ];
    const statsManagerUsers = statsManagerIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: statsManagerIds } },
          select: { id: true, email: true, firstName: true, lastName: true },
        })
      : [];
    const statsManagerNameById = new Map(
      statsManagerUsers.map((u) => [
        u.id,
        [u.lastName, u.firstName].filter(Boolean).join(' ').trim() || u.email,
      ]),
    );
    const managerSums = managerSumsRaw
      .map((row) => ({
        managerId: row.managerId,
        name: row.managerId
          ? (statsManagerNameById.get(row.managerId) ?? 'Неизвестный менеджер')
          : 'Без менеджера',
        sum: Number(row._sum.amount ?? 0),
      }))
      .sort((a, b) => b.sum - a.sum);

    const directionManagerSums = directionManagerSumsRaw
      .map((row) => ({
        direction: row.direction,
        managerId: row.managerId,
        name: row.managerId
          ? (statsManagerNameById.get(row.managerId) ?? 'Неизвестный менеджер')
          : 'Без менеджера',
        sum: Number(row._sum.amount ?? 0),
      }))
      .sort((a, b) => b.sum - a.sum);

    return {
      data: rawData.map((row) => this.serialize(row)),
      total,
      page,
      limit: take,
      totalPages: Math.ceil(total / take),
      totalSum: Number(sum._sum.amount ?? 0),
      directionSums: directionSums.map((row) => ({
        direction: row.direction,
        sum: Number(row._sum.amount ?? 0),
      })),
      managerSums,
      directionManagerSums,
      managers,
    };
  }

  /**
   * Пользователи из справочника «Карточки менеджеров» (Подписанты) —
   * менеджером по договору может быть любой сотрудник, а не только роль «Менеджер».
   */
  private async signatoryProfileUserIds(): Promise<string[]> {
    const rows = await this.prisma.contractDocumentGlobalTemplate.findMany({
      where: { tab: SIGNATORY_PROFILES_TAB },
      select: { html: true },
    });

    const ids = new Set<string>();
    for (const row of rows) {
      let parsed: { items?: { crmUserId?: unknown }[] } | null = null;
      try {
        parsed = JSON.parse(row.html) as { items?: { crmUserId?: unknown }[] };
      } catch {
        continue;
      }
      for (const item of Array.isArray(parsed?.items) ? parsed.items : []) {
        const id = typeof item?.crmUserId === 'string' ? item.crmUserId.trim() : '';
        if (id) ids.add(id);
      }
    }
    return [...ids];
  }

  private serialize(
    row: Prisma.MoneyMovementGetPayload<{
      include: { manager: { select: { id: true; email: true; firstName: true; lastName: true } } };
    }>,
  ) {
    return {
      id: row.id,
      sourceId: row.sourceId,
      packageId: row.packageId,
      contractId: row.contractId,
      paymentDate: row.paymentDate.toISOString().slice(0, 10),
      performedAt: row.performedAt.toISOString(),
      amount: row.amount.toString(),
      paymentForm: row.paymentForm,
      paymentType: row.paymentType,
      /** Ручная проводка (модалка «Ручная запись в журнале ДП») — не связана с оплатой договора. */
      isManual: row.paymentType === PaymentType.OTHER && row.sourceId === null,
      addendumNumber: row.addendumNumber,
      basis: row.basis,
      notes: row.notes,
      contractNumber: row.contractNumber,
      customerName: row.customerName,
      direction: row.direction,
      office: row.office,
      manager: row.manager
        ? {
            id: row.manager.id,
            name:
              [row.manager.lastName, row.manager.firstName].filter(Boolean).join(' ').trim() ||
              row.manager.email,
          }
        : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /**
   * Создаёт запись ДП по новой оплате в «Оплаты и Управление договором».
   * Ошибка журнала не должна ломать операцию оплаты — пишем в лог и продолжаем.
   */
  async recordFromPackagePayment(payment: PackagePaymentRow): Promise<void> {
    try {
      const pkg = await this.prisma.contractDocumentPackage.findUnique({
        where: { id: payment.packageId },
        select: {
          kind: true,
          formData: true,
          createdById: true,
          responsibleManagerId: true,
          crmContract: { select: { id: true, contractNumber: true, customerName: true } },
          documentObject: { select: { customerName: true } },
        },
      });

      const officeId = officeIdFromFormData(pkg?.formData);
      const office = officeId
        ? await this.prisma.office.findUnique({ where: { id: officeId }, select: { name: true } })
        : null;

      await this.prisma.moneyMovement.create({
        data: {
          sourceId: payment.id,
          packageId: payment.packageId,
          contractId: pkg?.crmContract?.id ?? null,
          paymentDate: payment.paymentDate,
          performedAt: payment.createdAt,
          amount: payment.amount,
          paymentForm: payment.paymentForm,
          paymentType: payment.paymentType,
          addendumNumber: payment.addendumNumber,
          basis: payment.basis,
          notes: payment.notes,
          managerId: this.resolveMovementManagerId(pkg, payment),
          office: office?.name ?? null,
          contractNumber:
            pkg?.crmContract?.contractNumber ?? contractNumberFromFormData(pkg?.formData) ?? null,
          customerName:
            pkg?.crmContract?.customerName ??
            customerNameFromFormData(pkg?.formData) ??
            pkg?.documentObject?.customerName ??
            null,
          direction: pkg ? (PACKAGE_KIND_DIRECTION_NAME[pkg.kind] ?? pkg.kind) : null,
        },
      });
    } catch (error) {
      this.logger.error(
        `ДП: не удалось записать движение по оплате ${payment.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Менеджер движения ДП — сотрудник из «Карточки менеджера (из справочника)» вкладки
   * «Данные» договора; далее прежняя цепочка (responsibleManagerId → createdBy пакета)
   * и лишь в самом конце — записавший оплату. Правка оплаты (в том числе супер-админом)
   * не переатрибутирует движение на редактора.
   */
  private resolveMovementManagerId(
    pkg: {
      responsibleManagerId: string | null;
      createdById: string | null;
      formData: unknown;
    } | null,
    payment: PackagePaymentRow,
  ): string {
    const cardManagerId = pkg ? signatoryCrmUserIdFromFormData(pkg.formData) : '';
    if (cardManagerId) return cardManagerId;
    const chained = pkg
      ? computePackageEffectiveManagerUserId({
          responsibleManagerId: pkg.responsibleManagerId,
          createdById: pkg.createdById,
          formData: pkg.formData,
        })
      : '';
    return chained || payment.recordedById || '';
  }

  /** Синхронизирует запись ДП после изменения оплаты (по sourceId). */
  async syncFromPackagePayment(payment: PackagePaymentRow): Promise<void> {
    try {
      const pkg = await this.prisma.contractDocumentPackage.findUnique({
        where: { id: payment.packageId },
        select: { responsibleManagerId: true, createdById: true, formData: true },
      });
      const managerId = this.resolveMovementManagerId(pkg, payment);
      const existing = await this.prisma.moneyMovement.findUnique({
        where: { sourceId: payment.id },
        select: { id: true },
      });
      if (!existing) {
        await this.recordFromPackagePayment(payment);
        return;
      }
      await this.prisma.moneyMovement.update({
        where: { id: existing.id },
        data: {
          paymentDate: payment.paymentDate,
          amount: payment.amount,
          paymentForm: payment.paymentForm,
          paymentType: payment.paymentType,
          addendumNumber: payment.addendumNumber,
          basis: payment.basis,
          notes: payment.notes,
          // Менеджер — производное данных договора: правка оплаты поддерживает его актуальным.
          ...(managerId ? { managerId } : {}),
        },
      });
    } catch (error) {
      this.logger.error(
        `ДП: не обновить движение по оплате ${payment.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Удаляет запись ДП при удалении оплаты. */
  async removeBySourceId(sourceId: string): Promise<void> {
    try {
      await this.prisma.moneyMovement.deleteMany({ where: { sourceId } });
    } catch (error) {
      this.logger.error(
        `ДП: не удалить движение по оплате ${sourceId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Наличные менеджера с момента последней инкассации до текущего момента:
   * наличные оплаты минус наличные возвраты (в журнале возвраты хранятся положительной суммой).
   */
  async getIncassationCashBalance(managerId: string) {
    const [last, manager] = await Promise.all([
      this.prisma.managerIncassation.findFirst({
        where: { managerId },
        orderBy: { performedAt: 'desc' },
        select: { performedAt: true, amount: true, incassator: true },
      }),
      this.prisma.user.findUnique({
        where: { id: managerId },
        select: { email: true, firstName: true, lastName: true },
      }),
    ]);

    const movements = await this.prisma.moneyMovement.findMany({
      where: {
        managerId,
        paymentForm: PaymentForm.CASH,
        ...(last ? { performedAt: { gt: last.performedAt } } : {}),
      },
      select: { amount: true, paymentType: true },
    });

    const balance = movements.reduce(
      (sum, m) => sum.plus(m.paymentType === PaymentType.REFUND ? m.amount.neg() : m.amount),
      new Prisma.Decimal(0),
    );

    return {
      managerId,
      managerName: manager
        ? [manager.lastName, manager.firstName].filter(Boolean).join(' ').trim() || manager.email
        : null,
      balance: balance.toString(),
      lastIncassation: last
        ? {
            performedAt: last.performedAt.toISOString(),
            amount: last.amount.toString(),
            incassator: last.incassator,
          }
        : null,
    };
  }

  /**
   * Создаёт запись инкассации. Менеджер, сдающий инкассацию, — выбранный в форме
   * (по умолчанию текущий пользователь); запись фиксирует текущий пользователь (createdById).
   * Если инкассация сдаётся за другого менеджера (onBehalfOfId), остаток наличных
   * закрывается по кассе этого менеджера, а сдающий фиксируется в submitterId.
   */
  async createIncassation(dto: CreateManagerIncassationDto, currentUserId?: string) {
    if (!currentUserId) throw new UnauthorizedException('Пользователь не определён');

    const submitterId = dto.managerId?.trim() || currentUserId;
    const managerId = dto.onBehalfOfId?.trim() || submitterId;

    const [managerExists, submitterExists] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: managerId }, select: { id: true } }),
      managerId === submitterId
        ? Promise.resolve(true)
        : this.prisma.user.findUnique({ where: { id: submitterId }, select: { id: true } }),
    ]);
    if (!managerExists) throw new BadRequestException('Указанный менеджер не найден');
    if (!submitterExists) throw new BadRequestException('Указанный сдающий менеджер не найден');

    const record = await this.prisma.managerIncassation.create({
      data: {
        managerId,
        submitterId: submitterId === managerId ? null : submitterId,
        amount: dto.amount,
        incassator: dto.incassator.trim(),
        performedAt: new Date(dto.performedAt),
        notes: dto.notes?.trim() || null,
        createdById: currentUserId,
      },
      include: INCASSATION_MANAGER_INCLUDE,
    });

    // Уведомления (колокольчик + браузерные push) менеджеру кассы и сдающему — fire-and-forget.
    this.incassationNotify.onCreated(
      {
        id: record.id,
        managerId,
        submitterId: record.submitterId,
        managerName: record.manager
          ? [record.manager.lastName, record.manager.firstName].filter(Boolean).join(' ').trim() ||
            record.manager.email
          : null,
        submitterName: record.submitter
          ? [record.submitter.lastName, record.submitter.firstName]
              .filter(Boolean)
              .join(' ')
              .trim() || record.submitter.email
          : null,
        amount: Number(record.amount),
        incassator: record.incassator,
      },
      currentUserId,
    );

    return this.serializeIncassation(record);
  }

  /** Последние инкассации (для панели истории на странице ДП). */
  async listIncassations(limit = 50) {
    const records = await this.prisma.managerIncassation.findMany({
      orderBy: [{ performedAt: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(Math.max(limit, 1), 100),
      include: INCASSATION_MANAGER_INCLUDE,
    });
    return records.map((record) => this.serializeIncassation(record));
  }

  /**
   * Ручная запись (проводка) в журнале ДП: изъятие из кассы (amount < 0, например на бытовые
   * нужды) или внесение сумм, не проведённых в оплатах по договорам (amount > 0).
   * Наличные записи участвуют в остатке наличных менеджера для инкассации.
   */
  async createManualEntry(dto: CreateManualMoneyMovementDto, currentUserId?: string) {
    if (!currentUserId) throw new UnauthorizedException('Пользователь не определён');

    const managerId = dto.managerId?.trim() || currentUserId;
    const managerExists = await this.prisma.user.findUnique({
      where: { id: managerId },
      select: { id: true },
    });
    if (!managerExists) throw new BadRequestException('Указанный менеджер не найден');

    const row = await this.prisma.moneyMovement.create({
      data: {
        sourceId: null,
        packageId: null,
        contractId: null,
        paymentDate: new Date(dto.paymentDate),
        performedAt: new Date(),
        amount: dto.amount,
        paymentForm: dto.paymentForm,
        paymentType: PaymentType.OTHER,
        basis: dto.basis.trim(),
        notes: dto.notes?.trim() || null,
        managerId,
        direction: null,
        office: null,
      },
      include: { manager: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
    return this.serialize(row);
  }

  private serializeIncassation(row: IncassationWithManager) {
    return {
      id: row.id,
      performedAt: row.performedAt.toISOString(),
      amount: row.amount.toString(),
      incassator: row.incassator,
      notes: row.notes,
      manager: row.manager
        ? {
            id: row.manager.id,
            name:
              [row.manager.lastName, row.manager.firstName].filter(Boolean).join(' ').trim() ||
              row.manager.email,
          }
        : null,
      submitter: row.submitter
        ? {
            id: row.submitter.id,
            name:
              [row.submitter.lastName, row.submitter.firstName].filter(Boolean).join(' ').trim() ||
              row.submitter.email,
          }
        : null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
