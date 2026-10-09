import {
  ContractDocumentPackageKind,
  ContractDocumentPackageStatus,
  RepairScheduleProjectStatus,
} from '@prisma/client';
import { RepairScheduleFromPackageService } from './repair-schedule-from-package.service';
import { RepairSchedulesService } from './repair-schedules.service';

type PackageRow = {
  id: string;
  kind: ContractDocumentPackageKind;
  status: ContractDocumentPackageStatus;
  formData: Record<string, unknown>;
  createdById: string | null;
  responsibleManagerId: string | null;
  payments: Array<{
    amount: string;
    paymentType: string;
    addendumNumber: number | null;
    paymentDate: Date;
  }>;
  repairScheduleProjects: Array<{ id: string; status: RepairScheduleProjectStatus }>;
};

/** Заключённый договор с актом начала работ и оплатой ≥70% — pipeline «В работе». */
const WORK_IN_PROGRESS_FORM: Record<string, unknown> = {
  contract: { totalAmount: 100000 },
  repairWorkStartActSignedAt: '2026-09-01',
  repairWorkStartActPhotoUrl: 'act-start.png',
};

function payment(amount: string) {
  return {
    amount,
    paymentType: 'PREPAYMENT',
    addendumNumber: null,
    paymentDate: new Date('2026-09-01T00:00:00Z'),
  };
}

function makePackage(overrides: Partial<PackageRow> = {}): PackageRow {
  return {
    id: 'pkg1',
    kind: ContractDocumentPackageKind.REPAIR,
    status: ContractDocumentPackageStatus.CONTRACT_CONCLUDED,
    formData: { contract: { totalAmount: 100000 } },
    createdById: 'creator1',
    responsibleManagerId: null,
    payments: [],
    repairScheduleProjects: [],
    ...overrides,
  };
}

function makeService(packages: PackageRow[]) {
  const createdProjects: Array<{ dto: unknown; createdById: string | null; options?: unknown }> =
    [];
  const statusCalls: Array<{
    projectId: string;
    status: RepairScheduleProjectStatus;
    actorId: string | null;
    options?: unknown;
  }> = [];
  const prisma = {
    contractDocumentPackage: {
      findMany: jest.fn().mockResolvedValue(packages.map((p) => ({ ...p }))),
      findFirst: jest.fn(
        ({ where }: { where: { id: string } }) => packages.find((p) => p.id === where.id) ?? null,
      ),
    },
    repairScheduleProject: {
      findFirst: jest.fn(({ where }: { where: { packageId: string } }) => {
        const pkg = packages.find((p) => p.id === where.packageId);
        return pkg?.repairScheduleProjects[0] ? { id: pkg.repairScheduleProjects[0].id } : null;
      }),
    },
  };
  const repairSchedules = {
    create: jest.fn(async (dto: unknown, createdById: string | null, options?: unknown) => {
      createdProjects.push({ dto, createdById, options });
      return { id: `project-${createdProjects.length}` };
    }),
    setStatus: jest.fn(
      async (
        projectId: string,
        status: RepairScheduleProjectStatus,
        actorId: string | null,
        options?: unknown,
      ) => {
        statusCalls.push({ projectId, status, actorId, options });
        return { id: projectId, status };
      },
    ),
  };
  const service = new RepairScheduleFromPackageService(
    prisma as never,
    repairSchedules as unknown as RepairSchedulesService,
  );
  return { service, createdProjects, statusCalls };
}

describe('RepairScheduleFromPackageService.ensureFromConcludedRepairPackage', () => {
  it('создаёт проект по подписанному договору «Ремонт»', async () => {
    const { service, createdProjects } = makeService([makePackage()]);

    const res = await service.ensureFromConcludedRepairPackage('pkg1', 'user1');

    expect(res.created).toBe(true);
    expect(res.projectId).toBe('project-1');
    expect(createdProjects).toHaveLength(1);
    expect(createdProjects[0].createdById).toBe('user1');
  });

  it('не создаёт проект повторно, если он уже привязан к пакету', async () => {
    const { service, createdProjects } = makeService([
      makePackage({ repairScheduleProjects: [{ id: 'existing', status: 'NEW' }] }),
    ]);

    const res = await service.ensureFromConcludedRepairPackage('pkg1', 'user1');

    expect(res).toEqual({ created: false, projectId: 'existing' });
    expect(createdProjects).toHaveLength(0);
  });

  it('пропускает не-ремонтные и неподписанные пакеты', async () => {
    const { service, createdProjects } = makeService([
      makePackage({ id: 'pkg-windows', kind: ContractDocumentPackageKind.WINDOWS }),
      makePackage({ id: 'pkg-progress', status: ContractDocumentPackageStatus.IN_PROGRESS }),
    ]);

    expect(await service.ensureFromConcludedRepairPackage('pkg-windows', 'user1')).toEqual({
      created: false,
      projectId: null,
    });
    expect(await service.ensureFromConcludedRepairPackage('pkg-progress', 'user1')).toEqual({
      created: false,
      projectId: null,
    });
    expect(createdProjects).toHaveLength(0);
  });
});

describe('RepairScheduleFromPackageService.autoSyncFromConcludedRepairPackages', () => {
  it('создаёт недостающие проекты и двигает статусы за договорами, без рассылки уведомлений', async () => {
    const { service, createdProjects, statusCalls } = makeService([
      // проекта нет — автозагрузка
      makePackage({ id: 'pkg-new' }),
      // договор «В работе», проект ещё «Новый» — должен переехать в «В работе»
      makePackage({
        id: 'pkg-work',
        formData: WORK_IN_PROGRESS_FORM,
        payments: [payment('70000')],
        repairScheduleProjects: [{ id: 'proj-work', status: 'NEW' }],
      }),
      // договор только подписан, проект уже «В работе» (вручную) — не откатываем
      makePackage({
        id: 'pkg-manual',
        repairScheduleProjects: [{ id: 'proj-manual', status: 'IN_PROGRESS' }],
      }),
    ]);

    const res = await service.autoSyncFromConcludedRepairPackages('user1');

    expect(res).toEqual({
      scannedPackages: 3,
      created: 1,
      createdProjectIds: ['project-1'],
      statusUpdated: 1,
    });
    expect(createdProjects).toHaveLength(1);
    expect(statusCalls).toHaveLength(1);
    expect(statusCalls[0]).toEqual({
      projectId: 'proj-work',
      status: 'IN_PROGRESS',
      actorId: 'user1',
      options: { notify: false },
    });
  });
});

describe('RepairScheduleFromPackageService.syncProjectStatusFromPackage', () => {
  it('полностью оплаченный договор с закрывающим актом закрывает проект', async () => {
    const { service, statusCalls } = makeService([
      makePackage({
        id: 'pkg-done',
        formData: {
          ...WORK_IN_PROGRESS_FORM,
          repairContractClosed: true,
        },
        payments: [payment('100000')],
        repairScheduleProjects: [{ id: 'proj-done', status: 'IN_PROGRESS' }],
      }),
    ]);

    const res = await service.syncProjectStatusFromPackage('pkg-done', 'user1');

    expect(res).toEqual({ changed: true, projectId: 'proj-done', status: 'CLOSED' });
    expect(statusCalls).toHaveLength(1);
    expect(statusCalls[0].status).toBe('CLOSED');
  });

  it('не двигает статус, когда целевой совпадает или ранг ниже текущего', async () => {
    const { service, statusCalls } = makeService([
      // договор «В работе», проект уже «В работе»
      makePackage({
        id: 'pkg-same',
        formData: WORK_IN_PROGRESS_FORM,
        payments: [payment('70000')],
        repairScheduleProjects: [{ id: 'proj-same', status: 'IN_PROGRESS' }],
      }),
      // работы ещё не начаты («Подписан»), проект «В работе» — не откатываем
      makePackage({
        id: 'pkg-back',
        repairScheduleProjects: [{ id: 'proj-back', status: 'IN_PROGRESS' }],
      }),
    ]);

    const same = await service.syncProjectStatusFromPackage('pkg-same', 'user1');
    const back = await service.syncProjectStatusFromPackage('pkg-back', 'user1');

    expect(same).toEqual({ changed: false, projectId: 'proj-same', status: 'IN_PROGRESS' });
    expect(back).toEqual({ changed: false, projectId: 'proj-back', status: 'IN_PROGRESS' });
    expect(statusCalls).toHaveLength(0);
  });

  it('пакет без проекта статус не меняет', async () => {
    const { service, statusCalls } = makeService([
      makePackage({ id: 'pkg-noproject', repairScheduleProjects: [] }),
    ]);

    const res = await service.syncProjectStatusFromPackage('pkg-noproject', 'user1');

    expect(res).toEqual({ changed: false, projectId: null, status: null });
    expect(statusCalls).toHaveLength(0);
  });
});
