import type { ConfigService } from '@nestjs/config';
import type { ContractDocumentSigningSessionStatus, Prisma } from '@prisma/client';

export type SigningSessionAdminRow = {
  id: string;
  token: string;
  status: ContractDocumentSigningSessionStatus;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  documents: Prisma.JsonValue;
  managerNote: string | null;
  expiresAt: Date;
  viewedAt: Date | null;
  signedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  signedName: string | null;
  contractorLabel: string | null;
  contractorSignatory: string | null;
  signedPackageUrl: string | null;
  createdAt: Date;
};

/** Базовый адрес сайта из конфигурации (без завершающего слэша). */
export function signingSiteUrl(config: ConfigService): string {
  return (config.get<string>('SITE_URL') || 'http://localhost:3000').replace(/\/$/, '');
}

export function buildSignUrl(siteUrl: string, token: string): string {
  return `${siteUrl}/sign/${token}`;
}

export function toSigningSessionAdminDto(row: SigningSessionAdminRow, signUrl: string) {
  return {
    id: row.id,
    status: row.status,
    signUrl,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerEmail: row.customerEmail,
    documents: row.documents,
    managerNote: row.managerNote,
    expiresAt: row.expiresAt.toISOString(),
    viewedAt: row.viewedAt?.toISOString() ?? null,
    signedAt: row.signedAt?.toISOString() ?? null,
    rejectedAt: row.rejectedAt?.toISOString() ?? null,
    rejectionReason: row.rejectionReason,
    signedName: row.signedName,
    contractorLabel: row.contractorLabel,
    contractorSignatory: row.contractorSignatory,
    signedPackageUrl: row.signedPackageUrl,
    createdAt: row.createdAt.toISOString(),
  };
}
