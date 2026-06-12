import { Injectable } from '@nestjs/common';
import { ContractDocumentPackageKind, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SerializedDocumentCustomer } from './contracts-shared';

@Injectable()
export class ContractsCustomersService {
  constructor(private prisma: PrismaService) {}

  async getCustomersFromContracts(search?: string) {
    const buildTokenMatch = (rawToken: string): Prisma.ContractWhereInput => {
      const t = rawToken.trim();
      const digitsOnly = t.replace(/\D/g, '');
      const or: Prisma.ContractWhereInput[] = [
        { customerName: { contains: t, mode: 'insensitive' } },
        { customerPhone: { contains: t } },
        { customerAddress: { contains: t, mode: 'insensitive' } },
        {
          customer: {
            is: {
              OR: [
                { firstName: { contains: t, mode: 'insensitive' } },
                { lastName: { contains: t, mode: 'insensitive' } },
                { company: { contains: t, mode: 'insensitive' } },
                { phone: { contains: t } },
                { phones: { has: t } },
                { email: { contains: t, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
      if (digitsOnly.length >= 10) {
        or.push({ notes: { contains: digitsOnly, mode: 'insensitive' } });
      }
      return { OR: or };
    };

    const where: Prisma.ContractWhereInput = {
      OR: [
        { customerName: { not: null, notIn: [''] } },
        { customerPhone: { not: null, notIn: [''] } },
        { customerId: { not: null } },
      ],
    };
    if (search?.trim()) {
      const tokens = search
        .trim()
        .split(/\s+/)
        .map((x) => x.trim())
        .filter((x) => x.length > 0);
      if (tokens.length === 1) {
        where.AND = [buildTokenMatch(tokens[0]!)];
      } else if (tokens.length > 1) {
        where.AND = tokens.map((tok) => buildTokenMatch(tok));
      }
    }
    const contracts = await this.prisma.contract.findMany({
      where,
      select: {
        id: true,
        customerId: true,
        customerName: true,
        customerPhone: true,
        customerAddress: true,
        totalAmount: true,
        contractDate: true,
        contractNumber: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { contractDate: 'desc' },
    });

    const key = (name: string | null, phone: string | null) =>
      `${(name ?? '').trim()}|${(phone ?? '').trim()}`;

    const map = new Map<
      string,
      {
        customerId: string | null;
        customerName: string | null;
        customerPhone: string | null;
        customerAddress: string | null;
        contractCount: number;
        totalAmount: number;
        lastContractDate: Date | null;
        lastContractId: string | null;
        lastContractNumber: string | null;
        manager: { id: string; firstName: string | null; lastName: string | null } | null;
        contracts: {
          id: string;
          contractNumber: string | null;
          contractDate: Date | null;
          totalAmount: number;
        }[];
      }
    >();

    for (const c of contracts) {
      const k = c.customerId ? `cid:${c.customerId}` : key(c.customerName, c.customerPhone);
      const existing = map.get(k);
      const totalAmount = Number(c.totalAmount ?? 0);
      const contractEntry = {
        id: c.id,
        contractNumber: c.contractNumber,
        contractDate: c.contractDate,
        totalAmount,
      };
      if (!existing) {
        map.set(k, {
          customerId: c.customerId ?? null,
          customerName: c.customerName,
          customerPhone: c.customerPhone,
          customerAddress: c.customerAddress,
          contractCount: 1,
          totalAmount,
          lastContractDate: c.contractDate,
          lastContractId: c.id,
          lastContractNumber: c.contractNumber,
          manager: c.manager,
          contracts: [contractEntry],
        });
      } else {
        existing.contractCount += 1;
        existing.totalAmount += totalAmount;
        existing.contracts.push(contractEntry);
        if (!existing.customerId && c.customerId) {
          existing.customerId = c.customerId;
        }
      }
    }

    const customers = Array.from(map.values()).map((v) => ({
      customerId: v.customerId,
      customerName: v.customerName ?? '—',
      customerPhone: v.customerPhone ?? '—',
      customerAddress: v.customerAddress ?? null,
      contractCount: v.contractCount,
      totalAmount: v.totalAmount,
      lastContractDate: v.lastContractDate?.toISOString().slice(0, 10) ?? null,
      lastContractId: v.lastContractId,
      lastContractNumber: v.lastContractNumber,
      contracts: v.contracts.map((row) => ({
        id: row.id,
        contractNumber: row.contractNumber,
        contractDate: row.contractDate?.toISOString().slice(0, 10) ?? null,
        totalAmount: row.totalAmount,
      })),
      manager: v.manager
        ? {
            id: v.manager.id,
            firstName: v.manager.firstName,
            lastName: v.manager.lastName,
          }
        : null,
    }));

    const contractIds = [...new Set(customers.flatMap((c) => c.contracts.map((x) => x.id)))];
    const documentByContractId = await this.loadRepairDocumentCustomersByContractIds(contractIds);

    const customersWithDocument = customers.map((c) => {
      let documentCustomer: SerializedDocumentCustomer | null = null;
      for (const row of c.contracts) {
        const raw = documentByContractId.get(row.id);
        if (raw) {
          documentCustomer = this.serializeDocumentCustomer(raw);
          break;
        }
      }
      return { ...c, documentCustomer };
    });

    return { customers: customersWithDocument };
  }

  private parseCustomerFromFormData(formData: unknown): Record<string, unknown> | null {
    if (!formData || typeof formData !== 'object') return null;
    const c = (formData as Record<string, unknown>).customer;
    if (!c || typeof c !== 'object') return null;
    return c as Record<string, unknown>;
  }

  private async loadRepairDocumentCustomersByContractIds(
    contractIds: string[],
  ): Promise<Map<string, Record<string, unknown>>> {
    const out = new Map<string, Record<string, unknown>>();
    if (contractIds.length === 0) return out;

    const packages = await this.prisma.contractDocumentPackage.findMany({
      where: {
        kind: ContractDocumentPackageKind.REPAIR,
        crmContractId: { in: contractIds },
      },
      select: {
        crmContractId: true,
        formData: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          select: { formData: true },
        },
      },
    });

    for (const p of packages) {
      const cid = p.crmContractId;
      if (!cid) continue;
      const v0 = p.versions[0];
      const versionFd = v0?.formData;
      const merged =
        versionFd &&
        typeof versionFd === 'object' &&
        versionFd !== null &&
        Object.keys(versionFd as object).length > 0
          ? versionFd
          : p.formData;
      const cust = this.parseCustomerFromFormData(merged);
      if (cust) out.set(cid, cust);
    }
    return out;
  }

  private serializeDocumentCustomer(raw: Record<string, unknown>): SerializedDocumentCustomer {
    const s = (v: unknown) => (v == null ? '' : String(v));
    const typeRaw = raw.type;
    const type =
      typeRaw === 'COMPANY' || typeRaw === 'ENTREPRENEUR' || typeRaw === 'PERSON'
        ? typeRaw
        : 'PERSON';
    return {
      type,
      fullName: s(raw.fullName),
      representativeFullNameNominative: s(raw.representativeFullNameNominative),
      representativeFullNameGenitive: s(raw.representativeFullNameGenitive),
      organizationName: s(raw.organizationName),
      representativePositionNominative: s(raw.representativePositionNominative),
      representativePositionGenitive: s(raw.representativePositionGenitive),
      inn: s(raw.inn),
      ogrn: s(raw.ogrn),
      address: s(raw.address),
      phone: s(raw.phone),
      email: s(raw.email),
      bankDetails: s(raw.bankDetails),
      passportSeriesNumber: s(raw.passportSeriesNumber),
      passportIssuedBy: s(raw.passportIssuedBy),
      passportIssueDate: s(raw.passportIssueDate),
    };
  }
}
