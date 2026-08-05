import { Injectable } from '@nestjs/common';
import { FurnitureScheduleProjectStatus, RepairScheduleProjectStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  JointObjectsListResult,
  JointRawNode,
  clusterJointNodes,
  dateToIso,
  defaultRange,
  filterAndSortClusters,
  furnitureToNode,
  installationToNode,
  parseIsoDate,
  repairToNode,
  waybillToNode,
} from './joint-objects.shared';

@Injectable()
export class JointObjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: {
    search?: string;
    includeClosed?: boolean;
    installFrom?: string;
    installTo?: string;
    waybillFrom?: string;
    waybillTo?: string;
  }): Promise<JointObjectsListResult> {
    const includeClosed = Boolean(params.includeClosed);
    const installDefault = defaultRange(120, 180);
    const waybillDefault = defaultRange(60, 90);

    const installFrom = parseIsoDate(params.installFrom) ?? parseIsoDate(installDefault.fromIso)!;
    const installTo = parseIsoDate(params.installTo) ?? parseIsoDate(installDefault.toIso)!;
    const waybillFrom = parseIsoDate(params.waybillFrom) ?? parseIsoDate(waybillDefault.fromIso)!;
    const waybillTo = parseIsoDate(params.waybillTo) ?? parseIsoDate(waybillDefault.toIso)!;

    const [installs, repairs, furniture, waybills] = await Promise.all([
      this.prisma.installationScheduleEntry.findMany({
        where: {
          deletedAt: null,
          date: { gte: installFrom, lte: installTo },
        },
        select: {
          id: true,
          direction: true,
          date: true,
          timeFrom: true,
          timeTo: true,
          status: true,
          customerName: true,
          customerAddress: true,
          contractNumber: true,
          installerName: true,
          packageId: true,
          contractId: true,
          note: true,
          package: { select: { documentObjectId: true } },
        },
        orderBy: [{ date: 'asc' }, { timeFrom: 'asc' }],
        take: 5000,
      }),
      this.prisma.repairScheduleProject.findMany({
        where: includeClosed ? undefined : { status: { not: RepairScheduleProjectStatus.CLOSED } },
        include: {
          package: {
            select: {
              documentObjectId: true,
              formData: true,
              crmContract: {
                select: {
                  actWorkStartDate: true,
                  actWorkEndDate: true,
                  contractDurationDays: true,
                },
              },
            },
          },
          contract: {
            select: {
              actWorkStartDate: true,
              actWorkEndDate: true,
              contractDurationDays: true,
            },
          },
          entries: {
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
            take: 1,
            select: { id: true, date: true, text: true, kind: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 3000,
      }),
      this.prisma.furnitureScheduleProject.findMany({
        where: includeClosed
          ? undefined
          : { status: { not: FurnitureScheduleProjectStatus.CLOSED } },
        include: {
          package: {
            select: {
              documentObjectId: true,
              formData: true,
              crmContract: {
                select: {
                  actWorkStartDate: true,
                  actWorkEndDate: true,
                  contractDurationDays: true,
                },
              },
            },
          },
          contract: {
            select: {
              actWorkStartDate: true,
              actWorkEndDate: true,
              contractDurationDays: true,
            },
          },
          entries: {
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
            take: 1,
            select: { id: true, date: true, text: true, kind: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 3000,
      }),
      this.prisma.waybillTask.findMany({
        where: {
          deletedAt: null,
          date: { gte: waybillFrom, lte: waybillTo },
        },
        select: {
          id: true,
          date: true,
          timeFrom: true,
          timeTo: true,
          status: true,
          taskText: true,
          customerName: true,
          customerAddress: true,
          direction: true,
          contractId: true,
        },
        orderBy: [{ date: 'asc' }, { timeFrom: 'asc' }],
        take: 5000,
      }),
    ]);

    const nodes: JointRawNode[] = [];
    for (const row of installs) {
      const node = installationToNode(row);
      if (node) nodes.push(node);
    }
    for (const row of repairs) nodes.push(repairToNode(row));
    for (const row of furniture) nodes.push(furnitureToNode(row));
    for (const row of waybills) nodes.push(waybillToNode(row));

    const filtered = filterAndSortClusters(clusterJointNodes(nodes), params.search);

    return {
      objects: filtered,
      totalObjects: filtered.length,
      totalItems: filtered.reduce((sum, o) => sum + o.itemCount, 0),
      meta: {
        installFrom: dateToIso(installFrom)!,
        installTo: dateToIso(installTo)!,
        waybillFrom: dateToIso(waybillFrom)!,
        waybillTo: dateToIso(waybillTo)!,
        includeClosed,
      },
    };
  }
}
